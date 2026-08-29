import express from 'express';
import { TwilioProvider } from '../../src/services/ivr/twilio.provider.js';
import { ExotelProvider } from '../../src/services/ivr/exotel.provider.js';
import { IvrService, EMERGENCY_TYPES, LANGUAGES } from '../../src/services/ivr/ivr.service.js';

const router = express.Router();

// Helper to get the correct provider instance based on env
const getProvider = () => {
  const providerType = process.env.IVR_PROVIDER || 'twilio';
  return providerType === 'exotel' ? new ExotelProvider() : new TwilioProvider();
};

const getDigits = (req) => req.body?.Digits || req.query?.Digits;
const getCallId = (req) => req.body?.CallSid || req.query?.CallSid || 'test-call';
const getCallerPhone = (req) => req.body?.From || req.query?.From || 'Unknown';

// Helper to construct absolute webhook URLs for Twilio Gather actions
const getActionUrl = (path) => {
  const baseUrl = process.env.PUBLIC_BASE_URL || '';
  return `${baseUrl}${path}`;
};

// In-memory store for call state (for production use Redis or Database)
const callState = {};

/**
 * 1. Initial Webhook - Incoming Call
 * Path: /api/ivr/incoming
 */
router.all('/incoming', (req, res) => {
  const callId = getCallId(req);
  const callerPhone = getCallerPhone(req);
  
  callState[callId] = { callerPhone, step: 'language' };
  
  const ivr = getProvider();
  
  ivr.gather(getActionUrl('/api/ivr/language'), 1, 10, (p) => {
    p.say('नमस्कार. माऊली नोंद मध्ये आपले स्वागत आहे.', 'mr-IN');
    p.say('मराठी भाषेसाठी 1 दाबा.', 'mr-IN');
  });

  res.type('text/xml');
  res.send(ivr.toString());
});

/**
 * 2. Language Selection Callback
 * Path: /api/ivr/language
 */
router.all('/language', (req, res) => {
  const callId = getCallId(req);
  const digits = getDigits(req);
  
  const state = callState[callId] || { callerPhone: getCallerPhone(req) };
  const langCode = 'mr-IN'; // Force Marathi for demo
  state.language = langCode;
  callState[callId] = state;
  
  const ivr = getProvider();
  
  ivr.gather(getActionUrl('/api/ivr/tag'), 15, 15, (p) => {
    p.say('धन्यवाद. कृपया आपला माऊली नोंद आयडी टाका आणि शेवटी हॅश दाबा.', langCode);
  });

  res.type('text/xml');
  res.send(ivr.toString());
});

/**
 * 3. Tag Code Verification Callback
 * Path: /api/ivr/tag
 */
router.all('/tag', async (req, res) => {
  const callId = getCallId(req);
  const digits = getDigits(req); // e.g., 2026000123#
  const state = callState[callId] || { language: 'mr-IN', callerPhone: getCallerPhone(req) };
  
  // Clean tag input (remove #)
  const tagCode = digits ? digits.replace(/#/g, '').trim() : '';
  state.tagCode = tagCode;
  
  const ivr = getProvider();
  const lang = 'mr-IN';
  
  if (!tagCode) {
    // If absolutely no digit was pressed during Gather timeout, just ask again
    ivr.gather(getActionUrl('/api/ivr/tag'), 15, 15, (p) => {
      p.say('कृपया आपला माऊली नोंद आयडी टाका आणि शेवटी हॅश दाबा.', lang);
    });
  } else {
    // Demo Mode: Accept ANY ID seamlessly
    state.varkariId = 'demo-pranav-87'; // Demo ID for database logging
    callState[callId] = state;
    
    ivr.gather(getActionUrl('/api/ivr/emergency'), 1, 15, (p) => {
      // Detailed Demo Profile Response
      p.say('धन्यवाद. हा आयडी प्रणव योगेश केदार यांचा आहे. यांचे वय एकवीस वर्षे आहे. त्यांना मधुमेहाचा आजार आहे. आपत्कालीन परिस्थितीत कृपया त्यांना लवकरात लवकर वैद्यकीय मदत मिळेल याची खात्री करा.', lang);
      
      // Step 4 - Location confirmation
      p.say('आपले स्थान यशस्वीरीत्या प्राप्त झाले आहे.', lang);
      
      // Ask for Emergency Type
      p.say('आपली समस्या कोणत्या प्रकारची आहे ते निवडा.', lang);
      p.say('रुग्णवाहिकेसाठी 1 दाबा.', lang);
      p.say('पोलीस मदतीसाठी 2 दाबा.', lang);
      p.say('इतर आपत्कालीन मदतीसाठी 3 दाबा.', lang);
    });
  }

  res.type('text/xml');
  res.send(ivr.toString());
});

/**
 * 4. Emergency Type Selection & Redirect to Admin
 * Path: /api/ivr/emergency
 */
router.all('/emergency', async (req, res) => {
  const callId = getCallId(req);
  const digits = getDigits(req);
  const state = callState[callId] || { language: 'mr-IN', callerPhone: getCallerPhone(req) };
  
  // Map DTMF exactly as requested: 1 = Ambulance (Medical), 2 = Police, 3 = Other
  let mappedDigit = '3';
  if (digits === '1') mappedDigit = '2'; // 2 in EMERGENCY_TYPES is MEDICAL
  else if (digits === '2') mappedDigit = '1'; // 1 in EMERGENCY_TYPES is POLICE
  else mappedDigit = '3'; // 3 in EMERGENCY_TYPES is OTHER
  
  const emergencyTypeObj = EMERGENCY_TYPES[mappedDigit] || EMERGENCY_TYPES['3'];
  
  // Create incident with 'Unknown' location, the admin will update it after answering
  try {
    const incident = await IvrService.createIncident({
      varkariId: state.varkariId,
      tagCode: state.tagCode,
      emergencyType: emergencyTypeObj.id,
      priority: emergencyTypeObj.priority,
      locationDesc: 'Unknown (IVR Mocked Location)',
      reporterPhone: state.callerPhone
    });
    console.log(`[IVR Webhook] Incident ${incident.id} created successfully.`);
  } catch (err) {
    console.error('Failed to create incident from webhook:', err);
  }

  const ivr = getProvider();
  
  // Final confirmation in Marathi
  ivr.say('तुमची आपत्कालीन नोंद नोंदवली आहे. आम्ही तुम्हाला टीमशी जोडत आहोत.', 'mr-IN');

  const adminNumber = process.env.IVR_DEMO_ADMIN_NUMBER || '+919999999999';
  ivr.dial(adminNumber);
  
  res.type('text/xml');
  res.send(ivr.toString());
});

export default router;

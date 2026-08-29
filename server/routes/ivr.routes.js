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

// Helper to parse Digits from Twilio or Exotel
const getDigits = (req) => req.body?.Digits || req.query?.Digits;
const getCallId = (req) => req.body?.CallSid || req.query?.CallSid || 'test-call';
const getCallerPhone = (req) => req.body?.From || req.query?.From || 'Unknown';

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
  
  ivr.gather('/api/ivr/language', 1, 10, (p) => {
    // Initial Greeting in Hindi
    p.say('माऊलीनोंद में आपका स्वागत है। भाषा चुनने के लिए कृपया एक दबाएँ।', 'hi-IN');
    // Language options
    p.say('Press 1 for English.', 'en-IN');
    p.say('हिंदी के लिए 2 दबाएं।', 'hi-IN');
    p.say('मराठीसाठी 3 दाबा.', 'mr-IN');
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
  
  const state = callState[callId] || {};
  const langCode = LANGUAGES[digits] || 'hi-IN'; // fallback to Hindi
  state.language = langCode;
  callState[callId] = state;
  
  const ivr = getProvider();
  
  ivr.gather('/api/ivr/tag', 15, 10, (p) => {
    if (langCode === 'en-IN') {
      p.say('Please enter the unique code written on the safety tag followed by the hash key.', langCode);
    } else if (langCode === 'hi-IN') {
      p.say('कृपया सुरक्षा टैग पर लिखा विशिष्ट कोड दर्ज करें, उसके बाद हैश कुंजी दबाएं।', langCode);
    } else {
      p.say('कृपया सुरक्षा टॅगवर लिहिलेला युनिक कोड एंटर करा, त्यानंतर हॅश की दाबा.', langCode);
    }
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
  const state = callState[callId] || { language: 'hi-IN' };
  
  // Clean tag input (remove #)
  const tagCode = digits ? digits.replace('#', '') : '';
  state.tagCode = tagCode;
  
  try {
    const varkari = await IvrService.lookupVarkari(tagCode);
    if (varkari) {
      state.varkariId = varkari.id;
    }
  } catch (err) {
    console.error('Error looking up Varkari in IVR:', err);
  }

  callState[callId] = state;
  const ivr = getProvider();
  
  ivr.gather('/api/ivr/emergency', 1, 10, (p) => {
    const lang = state.language;
    if (lang === 'en-IN') {
      if (!state.varkariId) p.say('Unknown caller. Continuing emergency report.', lang);
      p.say('Press 1 for Medical Emergency. Press 2 for Lost and Found. Press 3 for SOS. Press 4 for Fire Emergency. Press 5 for Accident. Press 6 for Other.', lang);
    } else {
      // Simplified Hindi version
      if (!state.varkariId) p.say('अज्ञात कॉलर। आपातकालीन रिपोर्ट जारी है।', 'hi-IN');
      p.say('मेडिकल इमरजेंसी के लिए 1 दबाएं। लॉस्ट एंड फाउंड के लिए 2 दबाएं। एसओएस के लिए 3 दबाएं। आग के लिए 4 दबाएं। दुर्घटना के लिए 5 दबाएं। अन्य के लिए 6 दबाएं।', 'hi-IN');
    }
  });

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
  const state = callState[callId] || { language: 'hi-IN', callerPhone: getCallerPhone(req) };
  
  const emergencyTypeObj = EMERGENCY_TYPES[digits] || EMERGENCY_TYPES['6'];
  
  // Create incident with 'Unknown' location, the admin will update it after answering
  try {
    const incident = await IvrService.createIncident({
      varkariId: state.varkariId,
      tagCode: state.tagCode,
      emergencyType: emergencyTypeObj.id,
      priority: emergencyTypeObj.priority,
      locationDesc: 'Unknown (Awaiting Admin Update)',
      reporterPhone: state.callerPhone
    });
    console.log(`[IVR Webhook] Incident ${incident.id} created successfully.`);
  } catch (err) {
    console.error('Failed to create incident from webhook:', err);
  }

  const ivr = getProvider();
  const lang = state.language;

  if (lang === 'en-IN') {
    ivr.say('Your emergency report has been recorded. We are connecting you to the response team.', lang);
  } else if (lang === 'hi-IN') {
    ivr.say('आपकी आपातकालीन सूचना दर्ज कर ली गई है। हम आपको रिस्पांस टीम से जोड़ रहे हैं।', lang);
  } else {
    ivr.say('तुमची आपत्कालीन नोंद नोंदवली आहे. आम्ही तुम्हाला टीमशी जोडत आहोत.', 'hi-IN');
  }

  const adminNumber = process.env.IVR_DEMO_ADMIN_NUMBER || '+919999999999';
  ivr.dial(adminNumber);
  
  res.type('text/xml');
  res.send(ivr.toString());
});

export default router;

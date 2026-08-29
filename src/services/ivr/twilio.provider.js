import { IvrProvider } from './ivr.provider.js';

/**
 * Twilio IVR Provider Implementation
 * Generates standard TwiML (XML)
 */
export class TwilioProvider extends IvrProvider {
  constructor() {
    super();
    this.xml = [];
  }

  say(text, language = 'hi-IN') {
    // Basic mapping to Twilio voices. Twilio supports Alice for hi-IN and en-IN.
    const voice = 'Polly.Aditi'; // Example Indian voice
    this.xml.push(`<Say voice="${voice}" language="${language}">${text}</Say>`);
    return this;
  }

  gather(actionUrl, numDigits = 1, timeout = 5, promptCallback) {
    this.xml.push(`<Gather action="${actionUrl}" numDigits="${numDigits}" timeout="${timeout}">`);
    if (promptCallback) {
      promptCallback(this);
    }
    this.xml.push(`</Gather>`);
    return this;
  }

  dial(phoneNumber) {
    this.xml.push(`<Dial>${phoneNumber}</Dial>`);
    return this;
  }
  
  record(actionUrl, maxLength = 30) {
    this.xml.push(`<Record action="${actionUrl}" maxLength="${maxLength}" playBeep="true" />`);
    return this;
  }

  hangup() {
    this.xml.push(`<Hangup/>`);
    return this;
  }

  toString() {
    return `<?xml version="1.0" encoding="UTF-8"?><Response>${this.xml.join('')}</Response>`;
  }
}

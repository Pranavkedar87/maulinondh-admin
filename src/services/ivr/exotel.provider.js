import { IvrProvider } from './ivr.provider.js';

/**
 * Exotel IVR Provider Implementation
 * Exotel uses a variant of TwiML/nXML.
 */
export class ExotelProvider extends IvrProvider {
  constructor() {
    super();
    this.xml = [];
  }

  say(text, language = 'hi-IN') {
    // Exotel handles language parsing internally or relies on pre-recorded audio for best results.
    // We output standard Say blocks.
    this.xml.push(`<Say language="${language}">${text}</Say>`);
    return this;
  }

  gather(actionUrl, numDigits = 1, timeout = 5, promptCallback) {
    // Exotel Gather block
    this.xml.push(`<Gather action="${actionUrl}" numDigits="${numDigits}" timeout="${timeout}">`);
    if (promptCallback) {
      promptCallback(this);
    }
    this.xml.push(`</Gather>`);
    return this;
  }

  dial(phoneNumber) {
    this.xml.push(`<Dial><Number>${phoneNumber}</Number></Dial>`);
    return this;
  }
  
  record(actionUrl, maxLength = 30) {
    // Exotel supports Record
    this.xml.push(`<Record action="${actionUrl}" maxLength="${maxLength}" />`);
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

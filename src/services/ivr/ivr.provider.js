/**
 * Base IVR Provider Interface
 * All specific providers (Exotel, Twilio) should extend this class.
 */
export class IvrProvider {
  /**
   * Initialize a new IVR response builder
   */
  constructor() {
    this.response = '';
  }

  /**
   * Speak text to the caller
   * @param {string} text - The text to speak
   * @param {string} language - Language code (e.g. 'en-IN', 'hi-IN')
   */
  say(text, language = 'en-IN') {
    throw new Error('Method "say" must be implemented.');
  }

  /**
   * Gather DTMF digits from the caller
   * @param {string} actionUrl - Where to submit the gathered digits
   * @param {number} numDigits - Number of digits to collect
   * @param {number} timeout - Timeout in seconds
   * @param {function} promptCallback - Function to add prompts inside the gather block
   */
  gather(actionUrl, numDigits = 1, timeout = 5, promptCallback) {
    throw new Error('Method "gather" must be implemented.');
  }

  /**
   * Dial a number
   * @param {string} phoneNumber - Number to dial
   */
  dial(phoneNumber) {
    throw new Error('Method "dial" must be implemented.');
  }

  /**
   * Hangup the call
   */
  hangup() {
    throw new Error('Method "hangup" must be implemented.');
  }

  /**
   * Return the compiled XML/TwiML string
   */
  toString() {
    throw new Error('Method "toString" must be implemented.');
  }
}

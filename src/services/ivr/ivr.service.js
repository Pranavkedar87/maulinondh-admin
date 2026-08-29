import { supabase } from '../supabase.js';

export const EMERGENCY_TYPES = {
  '1': { id: 'POLICE', priority: 'CRITICAL' },
  '2': { id: 'MEDICAL', priority: 'HIGH' },
  '3': { id: 'OTHER', priority: 'STANDARD' }
};

export const LANGUAGES = {
  '1': 'en-IN',
  '2': 'hi-IN',
  '3': 'mr-IN' // Pseudo-code for Marathi, standard providers might map this or require recorded audio
};

export class IvrService {
  /**
   * Create a new Incident from IVR
   */
  static async createIncident(data) {
    const { 
      varkariId, 
      tagCode, 
      emergencyType, 
      priority, 
      locationDesc, 
      reporterPhone 
    } = data;

    const payload = {
      varkari_id: varkariId || null,
      type: emergencyType,
      priority: priority,
      address: locationDesc || 'Unknown (Awaiting Admin Update)',
      reporter_phone: reporterPhone || 'UNKNOWN_CALLER',
      source: 'IVR',
      status: 'OPEN',
      description: `Emergency reported via IVR. Tag Code provided: ${tagCode}`,
    };

    const { data: incident, error } = await supabase
      .from('incidents')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Failed to create IVR incident:', error);
      throw error;
    }

    return incident;
  }

  /**
   * Fetch Varkari by Tag Code
   */
  static async lookupVarkari(tagCode) {
    if (!tagCode) return null;
    
    // Tag codes are typically in format MN-2026-... 
    // Usually the user enters digits and hash, e.g., 2026000123.
    // Assuming registration_id or tag code logic here:
    const { data, error } = await supabase
      .from('varkaris')
      .select('*')
      .eq('registration_id', tagCode.trim())
      .single();

    if (error || !data) return null;
    return data;
  }
}

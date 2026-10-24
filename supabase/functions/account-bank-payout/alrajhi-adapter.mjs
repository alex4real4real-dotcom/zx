// The commercial bank's approved API specification has not been supplied.
// Do not invent endpoint URLs, signing schemes or success-status mappings.
export function createAlrajhiAdapter() {
 return {configured:false,provider:'alrajhi',
  async submit(){throw new Error('BANK_INTEGRATION_NOT_CONFIGURED');},
  async lookup(){throw new Error('BANK_INTEGRATION_NOT_CONFIGURED');}
 };
}

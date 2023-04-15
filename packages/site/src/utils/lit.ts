export const set2FaPkpPublicKey = async (pkpPublicKey: string) => {
  localStorage.setItem('2faPkpPublicKey', pkpPublicKey);
};

export const get2FaPkpPublicKey = () => {
  const pkpPublicKey = localStorage.getItem('2faPkpPublicKey');
  if (pkpPublicKey) {
    return pkpPublicKey;
  }
  // TODO: error
  return '';
};

export const setSocialRecoveryPkpPublicKey = async (pkpPublicKey: string) => {
  localStorage.setItem('socialRecoveryPkpPublicKey', pkpPublicKey);
};

export const getSocialRecoveryPkpPublicKey = () => {
  const pkpPublicKey = localStorage.getItem('socialRecoveryPkpPublicKey');
  if (pkpPublicKey) {
    return pkpPublicKey;
  }
  // TODO: error
  return '';
};

export const setSocialRecoveryPkpEthAddress = async (pkpEthAddress: string) => {
  localStorage.setItem('socialRecoveryPkpEthAddress', pkpEthAddress);
};

export const getSocialRecoveryPkpEthAddress = () => {
  const pkpEthAddress = localStorage.getItem('socialRecoveryPkpEthAddress');
  if (pkpEthAddress) {
    return pkpEthAddress;
  }
  // TODO: error
  return '';
};

export const setPkpIpfsCid = async (ipfsCid: string) => {
  localStorage.setItem('pkpIpfsCid', ipfsCid);
};

export const getPkpIpfsCid = () => {
  const pkpIpfsCid = localStorage.getItem('pkpIpfsCid');
  if (pkpIpfsCid) {
    return pkpIpfsCid;
  }
  // TODO: error
  return '';
};

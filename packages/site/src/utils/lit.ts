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

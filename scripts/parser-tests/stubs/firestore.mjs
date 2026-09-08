// Test stub for @/lib/firestore. The parser is offline by design; only
// purchaseRecorder pulls firestore in (for id + write helpers) and the harness
// exercises just its pure chargeAmount math, so these never run.
export const generateTransactionId = () => 'TXN-TEST';
export const setDocument = async () => {};
export const getCollection = async () => [];
export const queryCollection = async () => [];
export const getDocument = async () => null;
export const updateDocument = async () => {};
export const deleteDocument = async () => {};

// Test stub for jspdf. The parser never renders a PDF; simpleReceipt only pulls
// jsPDF in at import time, so a no-op class keeps the bundle loadable under Node
// without the real (browser-oriented) library.
export class jsPDF {}
export default { jsPDF };

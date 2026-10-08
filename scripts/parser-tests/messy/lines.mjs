// Messy, human, typed-at-the-counter lines for the live sweep (run.mjs). No
// expectations here: read the output. A line that reads wrong goes into
// ../corpus.mjs with what it should read, then gets fixed.
export const LINES = [
  // keys
  'gimme 2 kw1', 'kw1 x 3 pls', 'lady wants 4 copies of her house key', 'cut key sc1 two of em', 'KW1 KW1 KW1', '1 kw1 1 sc1 1 y1',
  'key copy', 'need a mailbox key cut $6', 'three kw10 and one wr5', 'cut 2 keys', 'kw1 5 bucks', '2 keys 9.98', 'car key copy 25$',
  'guy wants padlock key x2 m1', 'dupe sc4', 'kw11 x 10 for the condo ppl',
  // shipping
  'ups toronto 22', 'UPS TORONTO 22', 'shipping to vancouver bc w fedex 31.50', 'ship purolator edmonton $18.75 for mike',
  'fedex 2 day to halifax 44 plus small box', 'canada post to regina 15', 'dhl to london uk 88', 'ups to new york 45 usd',
  'ups ground calgary to montreal 27.80 tracking 1Z999AA10123456784', 'purolator express winnipeg mb 33 phone 403 555 1212',
  'send parcel to red deer ab ups $14 and padded envelope', 'ship it ups 22', 'fed ex to ottawa 29', 'puro to saskatoon 21',
  'ups to toronot 22', 'label for ups to kelowna', 'shipping receipt 2 boxes to vancouver ups 22 and 25',
  'ups to st johns nl 51', 'ship to 123 main st toronto on m5v 2t6 ups 22', 'ups 19.99 to moose jaw sk large box',
  // tracking
  'track 1Z999AA10123456784', 'wheres my package 1Z999AA10123456784', 'fedex 123456789012', 'track purolator 329012345678',
  'did the ups thing arrive', 'tracking', 'canada post 1234567890123456', '1Z999AA10123456784',
  // refills / cartridges
  'refill hp 65 34', 'sarah refill hp65 $34', 'refill for mrs thompson canon 245xl black 29', 'customer dropped off 2 hp 61 for refill',
  'john 403-555-1212 brother tn660 refill 45', 'refil hp 564 xl color 31', 'ink refill epson 220 $22 for dave paid cash',
  'hp 65 ready', 'mark sarahs cartridge as done', 'ORD-1234 is ready for pickup', 'the canon 245 for mike is ready call him',
  'picked up ord-1042', 'refill hp 65 black and hp 65 colour 34 each for sarah', 'toner refill samsung mlt-d111s 40',
  'new refill order bob smith hp 902xl', 'whats the status of sarahs refill', 'list refills waiting', 'show me orders not picked up',
  // sales
  'sale 3 pens 4.50', 'sold a usb cable 12.99', 'customer bought 2 reams of paper 8.99 each', 'pack of envelopes 6', 'receipt for 20 copies 5 bucks',
  'colour prints x10 $1 each', 'fax 3 pages 6', 'laminating 2 sheets $4', 'passport photo 15.99', 'bubble mailer 2.50 x4',
  'receipt hp 65 new cartridge 39.99', 'sell brother tn760 89 no tax', 'usb stick 16gb $12 debit', 'scan to email 2$',
  // inventory
  'kw1', 'do we have any hp 61', 'how many kw1 left', 'price check canon 245', 'were out of sc1', 'out of a4 paper', 'add 20 kw1 to stock',
  'got 50 kw1 blanks in', 'received 10 hp 65', 'kw1 count is 42', 'set kw1 price to 4.99', 'wheres the y11', 'put sc1 in b3', 'b3 is empty',
  'move kw1 to a4', 'no more kw10 blanks', 'we got more toner', 'hp 65 xl in stock?', 'is there a tn660',
  // notes
  'note call bob back', 'remind me to order kw1 blanks', 'todo fix the laminator', 'note: mrs lee coming thursday for her keys; has $20 deposit',
  'dont forget landlord called abt rent', 'write down that ups pickup is at 3 now', 'memo printer 2 is jammed again',
  // timesheet
  'sue 10-6 today', 'sue worked 10 to 6', 'add shift for mike tomorrow 9-5', 'who works saturday', 'whos in today', 'sue left at 6',
  'sue came in at 10:30', 'mike is off friday', 'schedule ali mon wed fri 12-8', 'sue took a 30 min break', 'add employee rowan',
  'how many hours did sue work this week', 'cancel mikes shift tomorrow', 'swap sue and mike on friday', 'when does ali work next',
  // directory / misc
  'open the ups site', 'moneris login', 'whats the staples website', 'link for fedex pickup',
  // payments
  'charge 34 to card', 'refill hp 65 34 for sarah charge her card and print label', 'take payment 22.60', 'refund 15 to card',
  // multi
  '2 kw1 and ship ups to vancouver 22', 'refill hp 65 34 and note call sarah when ready', 'sue left at 6, also we are out of kw1',
  'sold 2 pens 3 and cut a kw1', 'track 1Z999AA10123456784 then make a note that it was late',
  // human mess
  'hi', 'help', 'thanks', 'asdf', 'lol nvm', 'wait no', 'undo', 'what can you do', 'how do i print a receipt', '22', 'sarah', '???',
  'the guy from yesterday came back for his thing', 'customer is mad his toner is streaky', 'do the thing', 'same as last time',
  'can u make me a reciept for a key', 'reciept 2 kw1', 'recipt for refill hp 65 34', 'um ok so this lady wants like 2 keys and also to ship something to her daughter in toronto with ups i think it was 22',
  'KW1!!!', 'kw-1', 'k w 1', 'hp65', 'h p 65 refill', 'refill 65', 'ups', '$22', 'toronto', 'une recharge hp 65 pour marie 34$',
  'ship 2 toronto', '2 toronto ups 22', 'call 4035551212', 'sarah 4035551212', 'what time do we close', 'is the boss in',
  'delete that', 'cancel', 'print it', 'make it 4x6', 'email receipt to sarah@gmail.com', 'bob wants his usual',
];
// [opening line, then each thing typed after]
export const CHATS = [
  ['ups to toronto 22', 'sarah jones', 'make it 25', 'add a box 5', 'actually fedex', 'no tax'],
  ['2 kw1', '4.50 each', 'make it 3', 'for mike', 'add a sc1'],
  ['refill hp 65', '34', 'sarah', '403 555 1212', 'actually model 67', 'colour not black'],
  ['sale pens 4.50', '3 of them', 'no tax', 'charge card'],
  ['sue worked 10-6 today', 'actually 10:30', '30 min break', 'no wait it was mike'],
  ['note call bob', 'about the toner', 'tomorrow'],
  ['ups to toronto 22', 'and another one to calgary 30', 'first one is 24', 'her number is 4035551212'],
  ['refill hp 65 34 for sarah', 'cut a kw1', 'who works saturday'],
  ['ship ups vancouver', '22', 'bc', 'tracking 1Z999AA10123456784', 'medium box'],
  ['2 kw1', 'oops 2 sc1', 'three of them instead', 'free'],
];

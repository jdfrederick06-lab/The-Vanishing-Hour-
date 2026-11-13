/* =====================================================================
   THE VANISHING HOUR — the printed evidence (approved Nov 12, doc tab "Evidence designs").
   SPOILERS: every word of every clue is in this file. Never load it on the invitation page.

   Each piece prints on its own page from print.html, with a manila FBI tag and a QR code.
   Scanning the QR (scan.html?e=CODE) marks its clue found on the host board, and puts a
   copy in the "Evidence room" every player can read (state ev/{code}).

     id     what the printer calls it          code   what the QR carries (short, not guessable)
     clue   the clue it marks found (null = none, just shared)
     item   the number on the FBI tag          holder who has it at the start of the night
     style  how it looks: form | cert | binder | letter | law | notecard | clipping | receipt |
            phonelog | program | photo | painting | bag | schedule | planner | tips | list | notice | memo
     aged   yellowed and folded (the 2001 pieces)
   Times on paper are clock times (doors at 7:00 PM, so 0:46 in the game is 7:46 PM).
   ===================================================================== */
STORY.evidenceCase = '27-0417';
STORY.evidence = [
  /* ---------- the nine approved printed pieces ---------- */
  { id: 'insurance', code: 'HC40', clue: '01', item: 1, holder: "Sterling's claim file", style: 'form', title: 'Harbor & Crane: Endorsement No. 4',
    head: { org: 'Harbor & Crane Insurance', sub: 'Fine Art & Collections · Schedule of Values', ref: 'Policy FA-118-0291' },
    fields: [['Insured', 'Victor J. Ashgrove'], ['Item', 'The Vanishing Hour, Henri Valcourt, 1874. Oil on canvas'], ['Previous value', '$82,000,000'], ['Revised value', '$115,000,000 (+40%)'], ['Effective', 'The 1st of last month'], ['Basis', 'Independent appraisal attached (P. Vale)'], ['Requested by', 'Q. Abernathy, Esq., for the insured'], ['Approved', 'S. Voss, Senior Claims Investigator']],
    stamp: 'APPROVED' },
  { id: 'appraisal', code: 'VF50', clue: 'R5', item: 2, holder: "Sterling's claim file", style: 'cert', title: 'Vale Fine Art Advisory: Certificate of Valuation',
    head: { org: 'Vale Fine Art Advisory', sub: 'Certificate of Valuation' },
    fields: [['Work', 'The Vanishing Hour, Henri Valcourt, 1874'], ['Fair market value', '$115,000,000'], ['Condition', 'Excellent'], ['Provenance', 'Unbroken'], ['Method', 'Examination of photographs supplied by the owner'], ['Requested', 'The 28th of the month before last'], ['Issued', 'The 28th of the month before last']],
    sign: 'Peregrine Vale', attach: 'Stapled behind: a small receipt in green ink. "Fee: $50,000. Received with thanks. P.V."' },
  { id: 'radio', code: 'RL46', clue: '05', item: 3, holder: "Lane's security binder", style: 'binder', title: 'Security binder: radio log, gala night',
    head: { org: 'Museum Security', sub: 'Radio log · East hall and vault · Gala night' },
    rows: [['7:02 PM', 'Pruitt', 'East hall: doors open, all clear.'], ['7:24 PM', 'Pruitt', 'East hall clear. Vault stairs locked.'], ['7:33 PM', 'Tate', 'Main room, all quiet.'], ['7:40 PM', 'Pruitt', 'Copy, heading to the vault stairs. Wait, who is this?'], ['7:46 PM', 'Pruitt', 'Agent here for a protocol check on the stairs. Copy.'], ['8:00 PM', 'Tate', 'Pruitt, radio check. (no answer)'], ['8:01 PM', 'Tate', 'Pruitt, come in. (no answer)']] },
  { id: 'juneletter', code: 'JE02', clue: '07', item: 4, holder: 'Marlowe', style: 'letter', aged: true, title: "June's letter",
    date: 'March 2, 2001', hand: true,
    body: ['Victor,', 'I won\'t come to the house again. I know what it would cost you, and I know you won\'t let it cost you anything.', 'But he is our son. He\'s four weeks old, he hasn\'t slept through one night, and I can\'t keep school and keep him both.', 'I\'m not asking you to love us. I\'m asking you to help.', 'He has your hands.'], sign: 'J.' },
  { id: 'estate', code: 'AR09', clue: '09', item: 5, holder: 'Quincy', style: 'law', title: 'Abernathy & Rhee: the estate letter',
    head: { org: 'Abernathy & Rhee', sub: 'Attorneys at Law · Private and confidential' }, date: 'Two weeks before the gala',
    body: ['Dear Victor,', 'Following our meeting, I must put this plainly in writing. You have no will. If you die without one, the law passes your entire estate to your next of kin. You have told me you have no living relatives. Unless there is a child, there is no one.', 'The will we prepared names Remy Laurent as sole beneficiary. As you asked, I will bring it to the gala, and we will sign at midnight before two witnesses.', 'Please do not put this off again.'], sign: 'Quincy Abernathy' },
  { id: 'notecard', code: 'VA05', clue: 'R2', item: 6, holder: "Victor's jacket (found after he dies)", style: 'notecard', hand: true, title: "Victor's notecard",
    mono: 'V.A.', body: ['If anyone asks, it was one of them:', 'Hollis Grant.', 'Lennox Blackwood.', 'Indigo Hart.', 'Wren Whitaker.', 'Kendall Ashgrove-Moore.'], under: 'Burn this.' },
  { id: 'wrenletter', code: 'WW20', clue: 'R3', item: 7, holder: "Victor's desk drawer (keyed lock 1)", style: 'letter', hand: true, angry: true, title: "Wren's letter",
    date: '2020', body: ['You fired me for telling the truth, and now you\'re suing me for it.', 'You\'ll pay for what you did to me.'], sign: 'W.W.' },
  { id: 'dart', code: 'DT04', clue: '04', item: 8, holder: 'Beside Charlie on the vault stairs (Bo finds it)', style: 'bag', title: 'The dart (evidence bag label)',
    fields: [['Contents', 'One fletched dart, steel tip, red fletching'], ['Recovered', 'Vault stairs, east hall, beside the body of C. Pruitt'], ['Recovered by', ''], ['Time', ''], ['Note', 'Handle with gloves. Possible toxin on the tip.']] },
  { id: 'painting', code: 'MC13', clue: '13', item: 9, holder: "Hangs where Victor's painting was", style: 'painting', title: "June's painting, Mother and Child",
    sign: 'J. Ellery, 2001' },

  /* ---------- inside the locks ---------- */
  { id: 'locker', code: 'CP12', clue: null, item: 10, holder: "Charlie's locker (three-digit lock box, 417)", style: 'receipt', title: "Charlie's locker: the NightBank receipt and the note",
    head: { org: 'NightBank', sub: 'Transfer receipt' }, fields: [['To', 'C. Pruitt (personal account)'], ['Amount', '$75,000.00'], ['From', 'Account ending 0291'], ['Memo', '(none)'], ['Date', 'Three weeks ago']],
    note: { mono: 'V.A.', text: 'C. Forget the vault stairs tonight. Nobody gets hurt.', sign: 'V.' } },
  { id: 'phonelog', code: 'PL01', clue: null, item: 11, holder: "Victor's desk drawer (keyed lock 1)", style: 'phonelog', aged: true, title: "Marlowe's message pad, 2001 (carbon copies)",
    rows: [['Mar 5, 2001', 'Ms. J. Ellery', 'Called, 3rd time, re: "the boy." Mr. A: do not put through.'], ['Mar 9', 'J. Ellery', 'Urgent. Not put through.']] },
  { id: 'clipright', code: 'HL14', clue: '08', item: 12, holder: "Victor's jacket, in a sealed envelope", style: 'clipping', aged: true, half: 'right', title: 'The clipping (right half)' },
  { id: 'clipleft', code: 'HL13', clue: '08', item: 13, holder: 'The archive box of 2001 papers (keyed lock 2)', style: 'clipping', aged: true, half: 'left', title: 'The clipping (left half, with her photo)' },
  { id: 'photo', code: 'PH00', clue: '03', item: 14, holder: 'The archive box of 2001 papers (keyed lock 2)', style: 'photo', aged: true, title: 'Photo print, December 2000',
    caption: 'Victor Ashgrove and J. E— at the Harbor gallery, December 2000.' },
  { id: 'program', code: 'GP20', clue: null, item: 15, holder: 'The archive box of 2001 papers (keyed lock 2)', style: 'program', aged: true, title: 'Harbor Gallery: student show program, December 2000',
    head: { org: 'The Harbor Gallery', sub: 'New Hands · The Winter Student Show · December 2000' },
    rows: [['Tomas Reyes', 'Still Life with Lemons'], ['Ada Lindqvist', 'Harbor, Early'], ['June Ellery', 'Study of a Window'], ['Marcus Bell', 'Untitled (Blue)'], ['Priya Nair', 'My Mother\'s Hands']] }
];

/* The clipping's full text (both halves read together). Same words as June's FBI record. */
STORY.clipping = {
  paper: 'Harbor Ledger', date: 'Wednesday, March 14, 2001',
  head: 'Young mother dies in Route 9 crash',
  text: 'June Ellery, 23, an art student of Harlow County, was killed Tuesday night when her car left Route 9 in heavy rain. She is survived by an infant son.'
};

/* Props the dossiers promise ("a paper clue the host provides"). Printed without QR codes:
   they belong to a character, who decides who sees them. */
STORY.props = [
  { id: 'schedule', holder: 'Bo', style: 'schedule', title: "Bo's old shift schedule", note: 'Locker 12 · combo 417' },
  { id: 'planner', holder: 'Harper', style: 'planner', title: "Harper's planner page", rows: [['Request', 'From', 'Note'], ['Winter Star photo moment at exactly 7:50 PM', 'V. Ashgrove', '"Not 7:49. Not 7:51."'], ['Floor plan + staff list', 'An FBI agent', 'Sent 3:40 PM'], ['Jet: one song, ~7:20', 'Jet\'s team', 'Speaker by the stage'], ['Catering van: out by 10', 'C. Brandt', 'Needs sign-off']] },
  { id: 'tips', holder: 'Parker', style: 'tips', title: "Parker's two tips (printouts)", rows: [['Two weeks ago', 'Be at the Ashgrove gala. The Ashgrove Collection won\'t survive the night.'], ['Three days ago', 'Ask about Hollis Grant, Lennox Blackwood, Indigo Hart, Wren Whitaker and Kendall Ashgrove-Moore. Every one of them wants Victor\'s art gone.']] },
  { id: 'linden', holder: 'Dominique', style: 'list', aged: true, title: 'The Linden Street list', head: 'Saint-Clair Foundation · Linden Street House · Residents 2004 to 2008', rows: ['A. M., 9', 'D. K., 14', 'V. R., 11', 'T. S., 6', 'R. E., 7', 'J. P., 12', 'L. O., 8'] },
  { id: 'notice', holder: 'Cameron', style: 'notice', title: 'Thorne Capital: final notice', head: 'Thorne Capital', body: ['FINAL NOTICE', 'To: Victor J. Ashgrove', 'Outstanding principal and interest: $15,240,000. All facilities are past due.', 'Payment in full is required by the last day of this month. Failing payment, Thorne Capital will exercise its security interest in the Ashgrove Collection without further notice.'], sign: 'C. Thorne, Managing Partner' },
  { id: 'accounts', holder: 'Penn', style: 'memo', title: 'Calloway Private: account summary', head: 'Calloway Private · Client summary · V. J. Ashgrove · Confidential', rows: [['Operating cash', '$31,200'], ['Securities', '$0 (liquidated 2022)'], ['Real estate', 'Mortgaged in full'], ['Art', 'The Ashgrove Collection (see Harbor & Crane)'],['Loans outstanding', '$15,240,000 (Thorne Capital)'], ['Personal loans (P. Calloway)', '$400,000 (no contract)']] },
  { id: 'will', holder: 'Quincy', style: 'memo', title: 'The unsigned will (cover page)', head: 'Last Will and Testament of Victor James Ashgrove', rows: [['Sole beneficiary', 'Remy Laurent'], ['Executor', 'Quincy Abernathy'], ['Signed', '________________ (not signed)'], ['Witnesses', '________________ / ________________']] },
  { id: 'thanks', holder: 'Skyler', style: 'letter', title: 'Thank-you letter from Emerson', date: 'Last spring', body: ['Dear friend,', 'Your generosity will honor your mother forever. When the new wing opens next spring, her name will be the first thing every visitor reads.', 'With deepest gratitude, and, as you asked, in complete confidence,'], sign: 'Emerson Albright' }
];

/* =====================================================================
   THE MINI-GAMES (approved Nov 12, doc tab "Mini-games"). Medium: 5 to 10 minutes each,
   a few harder, 20 at the very most. They show up in the player app under a "Tasks" tab.
     who      who sees it ('g:fbi' = the whole group, or character ids)
     backup   who gets it instead if everyone in "who" is marked no-show
     opens    { min } = minutes into the night (game clock), or { phase } = when that phase starts
     clue     marked found on the host board when it's solved
   The host can open, close, solve, reset or nudge any game (host terminal > Games).
   ===================================================================== */
STORY.games = [
  { id: 'vault', name: 'The vault dial', who: ['frankie'], backup: ['g:crew'], opens: { min: 50 },
    blurb: 'Three numbers, left, right, left. One from the vault schematic, one from Sloane, one from Jules\'s camera loop. Without them, you can crack it by feel.' },
  { id: 'camera', name: 'The camera loop', who: ['jules'], backup: ['g:crew'], opens: { min: 48 }, seconds: 90,
    blurb: 'Splice a recorded loop into each of six live feeds before the trace finds you. The vault keypad feed shows Frankie\'s third number.' },
  { id: 'decrypt', name: 'The sealed birth record', who: ['g:fbi'], opens: { min: 60 }, clue: '12', lockMin: 2,
    blurb: 'A court-sealed record from 2001. Three keys open it: the mother\'s surname, the year of birth, and the county.' },
  { id: 'messages', name: 'Victor\'s phone: the deleted thread', who: ['g:fbi'], opens: { phase: 'victor' }, clue: 'R6',
    blurb: 'Fourteen deleted messages, recovered out of order and damaged. Put them back in order and the missing words come back. Costs one lookup.' },
  { id: 'photo', name: 'The torn photograph', who: ['g:guest', 'g:staff', 'g:crew', 'g:thief'], opens: { min: 60 }, clue: '03',
    blurb: 'An old-photos account posted a picture torn into nine pieces. Put it back together and read the caption on the back.' },
  { id: 'differences', name: 'Is it real?', who: ['ari', 'g:guest'], opens: { min: 60 },
    blurb: 'The museum catalogue photo of "Harbor at Dusk" against the painting on the wall. Find the five differences.' },
  { id: 'ledger', name: 'Victor\'s collection ledger', who: ['sterling', 'penn'], opens: { phase: 'act1' }, clue: 'R5',
    blurb: 'Three entries in Victor\'s collection ledger don\'t add up. Find them.' },
  { id: 'doorlog', name: 'The door log', who: ['lane', 'bo'], opens: { min: 60 }, clue: '05',
    blurb: 'Every badge swipe in the building tonight. Who went into the vault stairwell before Charlie died?' }
];

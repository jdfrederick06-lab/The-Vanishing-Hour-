/* =====================================================================
   THE VANISHING HOUR — the truth, as it's read at the end of the night.
   SPOILERS: the whole solution is in this file. Only the host terminal and
   the big screen (reveal.html) load it. Never load it in the player app.

   killer       who really did it
   thiefGroup   the group that really stole the painting
   chapters     the story, one slide each. "say" is the line the host reads
                aloud (shown only on the host terminal); "body" is what the
                screen and every phone show.
   ===================================================================== */
STORY.reveal = {
  killer: 'rowan',
  thiefGroup: 'crew',
  diamondThief: 'vivienne',
  chapters: [
    { id: 'june', kicker: 'March 2001', title: 'A letter Victor never answered',
      body: ['June Ellery was 23, an art student, and the mother of Victor Ashgrove\'s four-week-old son.', 'On March 2 she wrote to him: "I\'m not asking you to love us. I\'m asking you to help." He refused to take her calls.', 'Eleven days later her car left Route 9 in the rain.'],
      say: 'Twenty-six years ago, a young art student named June Ellery wrote Victor a letter. He never answered it.' },
    { id: 'boy', kicker: 'The boy', title: 'Ro',
      body: ['Their son was born in February 2001. He grew up in foster care, where a little girl called Vivienne knew him as "Ro."', 'He was adopted in 2008, his birth record was sealed, and he grew up to join the FBI.', 'Victor never knew what became of him.'],
      say: 'Their son grew up in foster care. Vivienne Roux knew him there, as a little boy called Ro.' },
    { id: 'plan', kicker: 'Victor\'s plan', title: 'Steal your own painting',
      body: ['Victor was running out of money. He raised the painting\'s insurance by 40 percent: $115 million for a painting worth about $81 million.', 'Then he hired the art crew to steal it, and invited five enemies (Hollis, Lennox, Indigo, Wren and Kendall) to take the blame.', 'His diamond signal, two taps on a glass, sent Vivienne for the Winter Star so the crew could empty the vault.'],
      say: 'Victor Ashgrove planned tonight\'s theft himself. The crew worked for him.' },
    { id: 'charlie', kicker: 'The first murder · 7:50 PM', title: 'Charlie Pruitt',
      body: ['At 7:46 an "agent" radioed in for a protocol check on the vault stairs. Four minutes later Charlie was dead.', 'The dart came from the crew\'s own supplier, to frame them.', 'Then the killer hung his mother\'s painting in the vault, where Victor\'s had been.'],
      say: 'Charlie Pruitt died on the vault stairs, from a dart chosen to point at the crew.' },
    { id: 'victor', kicker: 'The second murder · 8:16 PM', title: 'Victor Ashgrove',
      body: ['Victor saw June\'s painting in his vault and went to the side room for air.', 'His visitor told him who he was, then killed him with Sloane\'s box cutter, so the crew would take the blame again.', 'With the last of his strength, Victor wrote one word on a napkin: JUNE.'],
      say: 'Victor died knowing exactly who had killed him. He wrote her name.' },
    { id: 'killer', kicker: 'The killer', title: 'The killer is', big: 'Rowan Hale',
      body: ['Special Agent Rowan Hale: Victor Ashgrove\'s son, by June Ellery.','He asked for this assignment, looked Victor up in FBI records 41 days ago, and needed him dead before midnight, before a new will could leave everything to someone else.', 'With no will, Victor\'s closest blood relative inherits it all.'],
      say: 'The killer is Special Agent Rowan Hale: Victor Ashgrove\'s son.' },
    { id: 'frames', kicker: 'How it fit together', title: 'Three frames, stacked',
      body: ['Victor framed his five enemies for the theft.', 'Rowan framed the crew for the murders.', 'And everyone suspected Vivienne, the diamond thief.'],
      say: 'Three frames, stacked on top of each other. And an FBI agent who secretly needed the thieves to win.' }
  ]
};

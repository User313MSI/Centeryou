const Episodes = (() => {
  function ep1() {
    const beats = [];
    const say = (start, dur, who, text) => beats.push({ type: 'subtitle', start, dur, who, text });
    const sfx = (start, name) => beats.push({ type: 'sfx', start, name });
    const mood = (start, m) => beats.push({ type: 'mood', start, mood: m });
    const scene = (start, dur, name) => beats.push({ type: 'scene', start, dur, name });
    const anim = (start, dur, name) => beats.push({ type: 'anim', start, dur, name });

    scene(0, 20, 'city');
    mood(0, 'wonder');
    say(2, 5, 'NARRATOR', 'Above the clouds floats Solenna, the city stitched from starlight.');
    say(8, 5, 'NARRATOR', 'For a thousand years, the Keepers have caught falling stars…');
    say(14, 5, 'NARRATOR', '…and sewn them back into the night.');
    sfx(0, 'wind'); sfx(12, 'sparkle');

    scene(20, 60, 'academy');
    say(22, 5, 'MASTER ORIN', 'A falling hour comes, little Keepers. The sky grows heavy.');
    say(28, 4, 'LUMI', 'Then let it fall! I will catch every single star!');
    say(33, 4, 'KAITO', 'You said that last time. The infirmary remembers.');
    say(38, 4, 'LUMI', 'The infirmary exaggerates!');
    say(43, 6, 'MASTER ORIN', 'Lumi. Tonight you catch your first star alone. Do not tear the sky.');
    say(50, 4, 'LUMI', 'I never tear the— okay. Once. Twice, maybe.');
    say(56, 3, 'KAITO', 'Take my star-catcher. Mark three. It wobbles less.');
    say(61, 3, 'LUMI', 'Kaito… thank you.');
    sfx(24, 'chime'); sfx(57, 'chime');

    scene(80, 110, 'night');
    mood(80, 'happy');
    say(82, 4, 'KAITO', 'There! South-south-east. A small one. Easy pickings.');
    say(87, 3, 'LUMI', 'I see it. Nix, chime me in!');
    sfx(90, 'chime');
    say(91, 4, 'LUMI', 'Star, hold still. Lumi of the Academy, coming down!');
    anim(96, 6, 'lumi_dive');
    sfx(96, 'whoosh');
    say(103, 4, 'LUMI', 'Got you! Ha! Did you see that?! Not one tear in the—');
    sfx(109, 'crash');
    say(110, 5, 'NARRATOR', 'Above them, the sky shivered… and folded.');
    anim(115, 8, 'constellation_fall');
    mood(115, 'tense');
    say(124, 5, 'KAITO', 'Lumi… tell me that is normal.');
    say(130, 4, 'LUMI', 'That is not normal.');
    say(135, 5, 'NARRATOR', 'The Silver Heron, brightest of all constellations, tore loose from the night.');

    scene(190, 90, 'city');
    say(192, 5, 'MASTER ORIN', 'The Heron falls toward the Old Quarter. Keepers! To the bridges!');
    say(198, 4, 'KAITO', 'Lumi, your hands are shaking.');
    say(203, 4, 'LUMI', 'They are excited hands.');
    say(208, 4, 'KAITO', 'They are shaking hands.');
    say(213, 6, 'MASTER ORIN', 'Both of you — climb the Starbridge and find the Heron\u2019s heart. Go!');
    say(220, 4, 'LUMI', 'Kaito. You are afraid of heights.');
    say(225, 5, 'KAITO', 'I am afraid of falling. The Heron is making it very relevant.');
    say(231, 4, 'LUMI', 'Then we will not fall. Promise.');
    sfx(215, 'wind'); sfx(230, 'chime');

    scene(280, 40, 'bridge');
    mood(280, 'epic');
    say(282, 6, 'NARRATOR', 'And so two small figures began to climb the oldest road in the sky.');
    say(290, 5, 'LUMI', 'Whatever is up there… we catch it together.');
    say(297, 5, 'KAITO', 'Together. But if I faint, you carry me.');
    anim(302, 8, 'climb');
    say(310, 5, 'NARRATOR', 'Episode One — "The Falling Hour" — continues next time…');
    sfx(305, 'sparkle');

    return { title: 'Episode 1 — The Falling Hour', beats, duration: 320 };
  }

  function ep2() {
    const beats = [];
    const say = (start, dur, who, text) => beats.push({ type: 'subtitle', start, dur, who, text });
    const sfx = (start, name) => beats.push({ type: 'sfx', start, name });
    const mood = (start, m) => beats.push({ type: 'mood', start, mood: m });
    const scene = (start, dur, name) => beats.push({ type: 'scene', start, dur, name });
    const anim = (start, dur, name) => beats.push({ type: 'anim', start, dur, name });

    scene(0, 45, 'bridge');
    mood(0, 'epic');
    say(2, 5, 'NARRATOR', 'The Starbridge hums under their feet, older than memory.');
    say(9, 4, 'KAITO', 'Question. How do you fight a constellation?');
    say(14, 4, 'LUMI', 'You don\u2019t fight it. You listen to it.');
    say(19, 4, 'KAITO', 'I meant with rope. I brought rope.');
    anim(24, 8, 'climb');
    say(33, 5, 'LUMI', 'Nix says the heart of the Heron is crying. Can you hear it?');
    sfx(30, 'chime'); sfx(38, 'wind');

    scene(45, 70, 'night');
    mood(45, 'tense');
    say(47, 5, 'NARRATOR', 'They found the Silver Heron tangled in the wind, wings wide as the dawn.');
    say(53, 5, 'LUMI', 'It is beautiful. It is also extremely pointy.');
    say(59, 5, 'KAITO', 'It is a bird made of knives. Do not touch the bird made of knives.');
    say(65, 6, 'LUMI', 'Orin said its heart is a star. If I hold the heart, it will remember the sky.');
    say(72, 4, 'KAITO', 'And if it does not want to be held?');
    say(77, 4, 'LUMI', 'Then I will be very fast and very polite.');
    anim(82, 8, 'heron');
    sfx(82, 'crash'); sfx(88, 'whoosh');

    scene(115, 100, 'night');
    mood(115, 'tense');
    say(117, 5, 'NARRATOR', 'Lumi reached into the storm of feathers—');
    anim(122, 6, 'lumi_dive');
    sfx(122, 'whoosh');
    say(129, 6, 'LUMI', 'I have it! The heart! It is so warm— the sky, it is—');
    sfx(135, 'crash');
    say(136, 5, 'NARRATOR', '—and the sky tore where Lumi touched it. As it always did.');
    mood(141, 'sad');
    say(142, 6, 'LUMI', 'Every time. Every time I try to sew a star, the sky tears. Why me?');
    say(150, 5, 'KAITO', 'Look at the tear. Lumi. Look at the tear.');
    say(156, 6, 'NARRATOR', 'Through the rip in the night, they saw it: a comet\u2019s tail, stitched into the sky like a signature.');
    say(163, 6, 'KAITO', 'You were not born from a comet. You ARE one. Comets do not sew stars, Lumi.');
    say(170, 5, 'LUMI', 'They cut new windows for them.');
    sfx(176, 'sparkle');

    scene(215, 70, 'night');
    mood(215, 'epic');
    say(217, 6, 'LUMI', 'The heart goes THROUGH the tear. Not around it. Kaito, the rope!');
    say(224, 3, 'KAITO', 'The rope! Catch!');
    sfx(227, 'whoosh');
    anim(230, 10, 'heron');
    say(241, 6, 'NARRATOR', 'Lumi plunged the Heron\u2019s heart through the tear in the sky—');
    sfx(250, 'crash'); sfx(252, 'sparkle');
    say(254, 6, 'NARRATOR', '—and the Silver Heron rose, wings re-stitched with a thousand new stars.');
    mood(258, 'wonder');
    say(262, 5, 'KAITO', 'You tore the sky… and it liked it.');
    say(268, 4, 'LUMI', 'I am a window-maker. Master Orin never said that job existed.');
    say(274, 4, 'KAITO', 'It did not. You invented it. Typical.');

    scene(285, 45, 'city');
    say(287, 6, 'MASTER ORIN', 'In eight hundred years, no Keeper made the sky GROW. The Academy has much to unlearn.');
    say(295, 4, 'LUMI', 'Then start with my grades.');
    say(300, 4, 'MASTER ORIN', '…We shall discuss the infirmary bill first.');
    say(306, 4, 'KAITO', 'Split three ways. Her idea. Catching every single star.');
    say(312, 6, 'NARRATOR', 'And over Solenna, for the first time in a thousand years — the night grew brighter.');
    sfx(312, 'sparkle'); sfx(318, 'chime');

    return { title: 'Episode 2 — The Sky Remembers', beats, duration: 330 };
  }

  return { ep1, ep2 };
})();
window.Episodes = Episodes;

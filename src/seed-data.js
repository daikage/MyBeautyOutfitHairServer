/**
 * Seed content for the salon database.
 *
 * This file is also imported by `scripts/generate-art.mjs`, which draws the
 * elegant SVG artwork shipped with each seeded style, so every style below
 * automatically gets matching art at `/art/<slug>.svg`.
 *
 * `s` = style helper: name, category, price from (USD), duration (minutes),
 * featured (1 = shown on the home page), description.
 */
const s = (name, category, price, minutes, featured, description) => ({
  name,
  category,
  price_from: price,
  duration_minutes: minutes,
  featured: featured ? 1 : 0,
  description,
  image_url: null, // filled in by the seeder with /art/<slug>.svg
});

export const CATEGORIES = [
  {
    name: 'Braids & Twists',
    blurb:
      'Knotless, box braids, goddess braids and twists - installed tension-free so your edges stay healthy.',
  },
  {
    name: 'Locs',
    blurb: 'Retwists, repairs and faux loc styles with clean parts and beautiful shape.',
  },
  {
    name: 'Weaves & Wigs',
    blurb: 'HD lace frontals, closures and glueless installs with a melt that truly disappears.',
  },
  {
    name: 'Natural Hair',
    blurb:
      'Wash, treat and shape your own crown - twist-outs, coils and moisture-rich care.',
  },
  {
    name: 'Silk Press & Styling',
    blurb: 'Glass-like silk presses, glamorous curls and special-occasion finishes.',
  },
  {
    name: 'Bridal & Events',
    blurb: 'Soft, romantic bridal hair and event styling that lasts from vows to last dance.',
  },
  {
    name: "Kid's Styling",
    blurb: 'Gentle, patient styling for little queens - with beads, bows and big smiles.',
  },
];

export const styleSeed = [
  // ------------------------------------------------------------ Braids & Twists
  s('Knotless Braids - Small', 'Braids & Twists', 260, 300, 1,
    'Feather-light small knotless braids that start with your own hair, so there is no bulky knot at the scalp and no tension on your edges. Sleek, scalp-friendly and long-lasting.'),
  s('Knotless Braids - Medium', 'Braids & Twists', 205, 240, 1,
    'The everyday favourite: medium knotless braids with neat square parts, a natural fall and enough flexibility to be worn up or down.'),
  s('Knotless Braids - Jumbo', 'Braids & Twists', 165, 180, 0,
    'Bold, statement jumbo knotless braids installed quickly for a lightweight protective style you can still tie into a high bun.'),
  s('Box Braids - Small', 'Braids & Twists', 245, 300, 0,
    'Classic small box braids with crisp parts and a full, timeless finish that frames the face beautifully.'),
  s('Box Braids - Jumbo', 'Braids & Twists', 150, 180, 0,
    'A quick, chic take on box braids with chunky sections and a relaxed, editorial feel.'),
  s('Goddess Braids', 'Braids & Twists', 235, 270, 1,
    'Braids with loose, flowing curls left out through the length for a soft romantic look that photographs beautifully.'),
  s('Fulani Braids', 'Braids & Twists', 215, 240, 0,
    'Cornrow-patterned braids with a centre braid, curved side braids and optional beads - a stunning cultural statement.'),
  s('Feed-In Cornrows', 'Braids & Twists', 125, 150, 0,
    'Clean, flat feed-in cornrows, styled straight back or in a pattern of your choosing. Neat enough for work, protective enough for weeks.'),
  s('Lemonade Braids', 'Braids & Twists', 195, 210, 0,
    'Side-swept, slanted cornrows made famous for a reason - sleek, flattering and endlessly elegant.'),
  s('Senegalese Twists', 'Braids & Twists', 225, 260, 0,
    'Smooth, lightweight Senegalese twists with a glossy finish and a soft, rope-like texture.'),
  s('Passion Twists', 'Braids & Twists', 205, 240, 1,
    'Bouncy, water-wave passion twists with a silky, lightweight feel and beautiful movement.'),
  s('Spring Twists', 'Braids & Twists', 215, 245, 0,
    'Full, voluminous spring twists - soft coils with a natural texture that holds shape for weeks.'),
  s('Marley Twists', 'Braids & Twists', 195, 240, 0,
    'Kinky, natural-looking Marley twists ideal for a textured protective style with real dimension.'),
  s('Stitch / Tribal Braids', 'Braids & Twists', 135, 180, 0,
    'Precision stitch braids with small accent braids in front - a polished, architectural look.'),
  s('Sleek Cornrow Ponytail', 'Braids & Twists', 145, 150, 0,
    'Sleek cornrows leading into a sculpted, high-shine ponytail with an invisible part.'),

  // ---------------------------------------------------------------------- Locs
  s('Faux Locs', 'Locs', 245, 300, 0,
    'Soft faux locs with a natural, lived-in texture - all the beauty of locs without the long-term commitment.'),
  s('Soft Locs', 'Locs', 235, 280, 1,
    'Buttery-soft locs with a loose, wavy finish that look natural and feel light as air.'),
  s('Butterfly Locs', 'Locs', 225, 260, 0,
    'Distressed, bohemian butterfly locs with beautiful texture and a trendy, undone elegance.'),
  s('Distressed / Boho Locs', 'Locs', 255, 300, 0,
    'Texture-rich distressed locs with wispy curls left out for a soft, goddess-like finish.'),
  s('Loc Retwist & Style', 'Locs', 115, 120, 1,
    'A gentle palm-roll retwist, fresh parts and a style of your choice to keep your locs neat, healthy and growing strong.'),
  s('Loc Repair & Detox', 'Locs', 100, 90, 0,
    'Clients with thinning or merging locs get careful repair, separation and a deep clarifying detox.'),
  s('Interlocking Maintenance', 'Locs', 125, 120, 0,
    'Root-flush interlocking for locs that need maintenance without product build-up. Ideal for active lifestyles.'),
  s('Microlocs Starter Set', 'Locs', 365, 480, 0,
    'A full day of meticulous work to start your microloc or sisterloc journey with clean, uniform parts.'),

  // ------------------------------------------------------------ Weaves & Wigs
  s('Traditional Sew-In', 'Weaves & Wigs', 185, 180, 0,
    'A braided foundation with a full, secure sew-in and a flawless, flat finish - protective and glamorous.'),
  s('Sew-In with Leave-Out', 'Weaves & Wigs', 155, 150, 0,
    'A seamless leave-out install that blends your own hair with the extensions for a completely natural result.'),
  s('Frontal Install (HD Lace Melt)', 'Weaves & Wigs', 225, 150, 1,
    'HD lace frontal melted, plucked and styled so the hairline is undetectable - ready for any occasion.'),
  s('Closure Install', 'Weaves & Wigs', 175, 120, 0,
    'A crisp closure install with a natural part and a beautiful, well-constructed finish.'),
  s('Glueless Wig Install', 'Weaves & Wigs', 135, 75, 0,
    'A quick, gentle glueless install - no adhesives, kind to your hairline and ready in about an hour.'),
  s('Wig Revamp & Style', 'Weaves & Wigs', 145, 90, 0,
    'Bring your unit back to life: wash, condition, restyle and refresh with a soft, healthy shine.'),
  s('Quick Weave', 'Weaves & Wigs', 115, 90, 0,
    'A fast protective weave with a sculpted bob or layered finish for an instant transformation.'),

  // ------------------------------------------------------------- Natural Hair
  s('Wash, Blow-Dry & Blowout', 'Natural Hair', 70, 60, 0,
    'A clarifying wash, deep condition and smooth blowout that leaves your hair soft, clean and full of body.'),
  s('Two-Strand Twists (Natural)', 'Natural Hair', 95, 120, 0,
    'Neat two-strand twists on your natural hair - a protective style that also sets the prettiest twist-out.'),
  s('Finger Coils', 'Natural Hair', 100, 120, 0,
    'Perfectly uniform finger coils with a defined, springy look that lasts for days.'),
  s('Twist-Out & Definition', 'Natural Hair', 90, 90, 0,
    'A moisture-rich set, defined twist-out and light shaping so your curls pop with shine and volume.'),
  s('TWA Shape & Trim', 'Natural Hair', 75, 60, 0,
    'A precision shape-up and dusting for short natural hair, so your cut looks intentional and grows out beautifully.'),
  s('Deep Conditioning Treatment', 'Natural Hair', 60, 45, 1,
    'A steam-assisted deep treatment that restores moisture, strength and shine to dry or colour-treated hair.'),
  s('Flat Twists with Bun', 'Natural Hair', 85, 90, 0,
    'Sleek flat twists into a polished bun - a low-maintenance, high-elegance protective style.'),
  s('Bantu Knot Out', 'Natural Hair', 90, 100, 0,
    'Bantu knots set for a soft, defined wave pattern with gorgeous, natural volume.'),

  // ---------------------------------------------------- Silk Press & Styling
  s('Silk Press (Natural Hair)', 'Silk Press & Styling', 90, 105, 1,
    'A salon silk press with a mirror shine and no heat damage: wash, treatment, blowout, press and finish.'),
  s('Silk Press with Precision Trim', 'Silk Press & Styling', 110, 125, 0,
    'Our signature silk press plus a precision trim that removes split ends and shapes your length.'),
  s('Blowout & Wand Curls', 'Silk Press & Styling', 100, 105, 0,
    'Smooth blowout finished with romantic wand curls - soft, bouncy and full of glamour.'),
  s('Sleek Ponytail', 'Silk Press & Styling', 75, 60, 0,
    'A glass-smooth ponytail with an invisible part and a wrap that stays put all night.'),
  s('Updo & Roller Set', 'Silk Press & Styling', 100, 90, 0,
    'A timeless roller set styled into an elegant updo, finished with a light hold and shine.'),
  s('Colour Gloss & Highlights', 'Silk Press & Styling', 155, 180, 0,
    'Custom colour, gloss and highlights applied safely and finished with a conditioning treatment.'),
  s('Rod Set / Defined Curls', 'Silk Press & Styling', 105, 105, 0,
    'Flexi-rod curls with beautiful definition and bounce that hold their shape for days.'),
  s('Braid-Out & Define', 'Silk Press & Styling', 85, 90, 0,
    'A braid-out set with soft definition and a luxurious sheen - the ultimate effortless finish.'),

  // ------------------------------------------------------------ Bridal & Events
  s('Bridal Updo (Freehand)', 'Bridal & Events', 285, 180, 1,
    'A custom freehand bridal updo designed around your dress, veil and venue. Includes pinning, finishing and touch-up tips.'),
  s('Bridal Party Styling (per person)', 'Bridal & Events', 145, 120, 0,
    'Coordinated styling for your bridesmaids and family so the whole party looks picture-perfect.'),
  s('Special Event Updo', 'Bridal & Events', 155, 120, 0,
    'Elegant updos for galas, showers, graduations and milestone birthdays.'),
  s('Camera-Ready Finish', 'Bridal & Events', 125, 90, 0,
    'A photoshoot and videography ready finish: flyaways tamed, shine perfected, look sealed for the camera.'),
  s('Bridal Trial Session', 'Bridal & Events', 135, 120, 0,
    'A relaxed trial appointment to design and refine your wedding-day look before the big day.'),
  s('Veil & Accessory Placement', 'Bridal & Events', 50, 30, 0,
    'Careful placement and securing of veils, combs, tiaras and fresh florals.'),

  // ------------------------------------------------------------- Kid's Styling
  s("Kid's Box Braids (Ages 4-12)", "Kid's Styling", 100, 180, 0,
    'Gentle, patiently installed box braids for little queens - no pulling, no rushing, lots of encouragement.'),
  s("Kid's Cornrows with Beads", "Kid's Styling", 75, 90, 1,
    'Neat cornrows with colourful beads, bows and clips chosen by your little one.'),
  s("Kid's Ponytail & Bow", "Kid's Styling", 60, 60, 0,
    'A quick, sweet ponytail with ribbons and bows for school mornings and special days.'),
  s("Kid's Wash & Bantu Knots", "Kid's Styling", 65, 75, 0,
    'A gentle wash, detangle and bantu knot set that keeps little hair healthy and cute.'),
  s('Parent & Child Duo', "Kid's Styling", 155, 210, 0,
    'Matching appointments - one booking, two beautiful styles for you and your mini me.'),
];

export const servicesSeed = [
  {
    title: 'Style Consultation',
    description:
      'A relaxed conversation about your hair history, lifestyle and the look you want. We plan the right style, extensions and aftercare before a single braid is placed.',
    icon: 'chat',
    price_from: 0,
    sort_order: 1,
  },
  {
    title: 'Healthy Hair Treatments',
    description:
      'Scalp care, clarifying washes and steam-assisted deep conditioning to restore moisture, strength and shine.',
    icon: 'drop',
    price_from: 60,
    sort_order: 2,
  },
  {
    title: 'Custom Colour & Gloss',
    description:
      'Gentle colour, gloss and highlights designed for textured hair, always finished with a conditioning treatment.',
    icon: 'sparkle',
    price_from: 155,
    sort_order: 3,
  },
  {
    title: 'Extension Installations',
    description:
      'Frontals, closures, sew-ins and glueless installs with a flat, seamless finish and a hairline that looks like yours.',
    icon: 'crown',
    price_from: 135,
    sort_order: 4,
  },
  {
    title: 'Bridal & Event Styling',
    description:
      'Trials, wedding day updos and party styling for you and your whole crew, with travel available on request.',
    icon: 'ring',
    price_from: 135,
    sort_order: 5,
  },
  {
    title: 'Kids & Family Styling',
    description:
      'Patient, gentle appointments for little ones plus mother-and-daughter duo bookings so nobody waits alone.',
    icon: 'heart',
    price_from: 60,
    sort_order: 6,
  },
  {
    title: 'Loc Care & Maintenance',
    description:
      'Retwists, interlocking, repairs and detoxes that keep your locs clean, neat and thriving.',
    icon: 'leaf',
    price_from: 100,
    sort_order: 7,
  },
  {
    title: 'Private Studio Experience',
    description:
      'One guest at a time in a calm, private studio with refreshments, good music and unhurried, careful work.',
    icon: 'star',
    price_from: 0,
    sort_order: 8,
  },
];

export const testimonialsSeed = [
  {
    author: 'Tiana R.',
    location: 'Houston, TX',
    rating: 5,
    quote:
      'My knotless braids were so light I forgot they were in. Six weeks later they still looked fresh. The studio is calm, spotless and she takes real care of your edges.',
  },
  {
    author: 'Aaliyah M.',
    location: 'Katy, TX',
    rating: 5,
    quote:
      'The silk press was ridiculous - glassy, bouncy and it lasted through a whole Texas week of humidity. I have finally found my stylist.',
  },
  {
    author: 'Denise W.',
    location: 'Sugar Land, TX',
    rating: 5,
    quote:
      'She did my daughter and me in one visit and was so patient with a wriggly seven year old. Beads, bows, braids - perfection.',
  },
  {
    author: 'Camille B.',
    location: 'Dallas, TX',
    rating: 5,
    quote:
      'My HD frontal install melted perfectly. Nobody could tell where my hairline ended. Worth every mile of the drive.',
  },
  {
    author: 'Brianna J.',
    location: 'Arlington, TX',
    rating: 5,
    quote:
      'Four years of retwists and my locs have never looked better. She repaired two thin ones I thought were done for.',
  },
  {
    author: 'Monique T.',
    location: 'Austin, TX',
    rating: 5,
    quote:
      'She styled my entire bridal party and my updo stayed flawless from ceremony to last dance. The trial appointment made me so calm.',
  },
];
# Battle system

Battles resolve automatically in hourly ticks, like HOI4. You win through fleet composition, ship designs, admirals, doctrine and where you send fleets, not by steering ships. You watch the battle unfold and can only give a few high-level orders.

## How a battle starts

1. Fleets sit in sea zones on a **mission**: patrol, strike force, convoy raiding, convoy escort, or invasion support.
2. Every hour, each side rolls **spotting**: its detection (radar, scouts, patrol mission bonus, air recon) against the enemy's visibility (ship size, weather, night).
3. Once spotted, the enemy's strike force or patrol engages, depending on each fleet's **aggressiveness** setting (see Fleet orders below).

## Battle lines

| Line | Ships | Role |
| --- | --- | --- |
| Screens | Destroyers, light cruisers | Shield the lines behind them from torpedoes; hunt subs |
| Capitals | Battleships, battlecruisers, heavy cruisers | Main firepower and armour |
| Carriers | Carriers | Stay at the back, launch air strikes in waves |
| Submarines | Submarines | Hidden until they fire; strong vs convoys |

**Screening:** each fleet needs a target ratio of screens per capital (tunable, e.g. 3:1), and capitals per carrier. Below that, enemy ships and torpedoes can reach your capitals and carriers more easily.

## Each hourly tick

1. **Targeting:** every ship picks a target, weighted towards bigger, more visible ships, and limited by screening.
2. **Gunfire:** light guns use *light attack* (good vs screens), big guns *heavy attack* (good vs capitals), plus *torpedo attack*. Hit chance depends on fire control, target visibility and speed, admiral skill, weather and night.
3. **Piercing vs armour:** if a gun's piercing is below the target's armour, its damage is heavily reduced. This is what makes armour and gun choices matter.
4. **Damage:** hits reduce **HP** and **organisation**, with a chance of critical hits (lost turret, fire control, engine, magazine explosion).
5. **Air strikes:** carriers launch waves every few hours; AA guns and fighters reduce their damage.
6. **Retreat:** ships withdraw when HP or organisation falls below their fleet's aggressiveness threshold. Faster ships escape more easily; slow, damaged ships get caught.

**Positioning:** a fleet-wide modifier on hit chance. It drops when a fleet is much larger than its admiral can coordinate, or as ships get damaged, so a huge doomstack is not automatically best.

## Ship stats (derived from the design)

| Stat | Comes from |
| --- | --- |
| HP, organisation | Hull, armour modules, crew experience |
| Armour | Belt and deck thickness |
| Light / heavy attack and piercing | Gun calibre, count, shell tech |
| Torpedo attack | Tubes, torpedo tech |
| AA | AA guns, fire control |
| Surface / sub visibility | Size; lower for submarines |
| Surface / sub detection | Radar, sonar, scout planes |
| Speed, range, reliability | Engines, fuel, design quality |

**Admirals** have skills (attack, defence, manoeuvring, coordination) and traits gained from battles, e.g. "Night fighter" or "Carrier specialist".

## Fleet orders: aggressiveness and repair

Every fleet has two standing orders, set on the fleet panel like HOI4.

| Aggressiveness | Engages when | Retreats at |
| --- | --- | --- |
| Do not engage | Never; avoids spotted enemies | Immediately if attacked |
| Low risk | Enemy clearly weaker | Light damage (about 75% HP or org) |
| Medium risk | Roughly even odds | Moderate damage (about 50%) |
| High risk | Even when outmatched | Heavy damage (about 25%) |
| Always engage | Always | Never retreats voluntarily |

| Repair status | Effect |
| --- | --- |
| Always repair | Any damaged ship returns to port for repair after combat |
| Repair on light damage | Returns below about 75% HP |
| Repair on heavy damage | Returns below about 40% HP |
| Do not repair | Stays on mission whatever its damage, until it sinks or the order changes |

Repairs use the naval base's capacity, so a low-level base near the front becomes a bottleneck. Each base has a repair priority (low, normal, high) for its queue. Thresholds are starting values to tune.

## Fleet experience

Each ship's crew has an experience level that improves hit chance, damage control, organisation recovery and positioning.

| Level | Rough modifier |
| --- | --- |
| Green | −10% |
| Trained | 0% |
| Regular | +5% |
| Seasoned | +10% |
| Veteran | +15% |
| Elite | +20% |

- Ships gain experience by fighting and from **naval exercises**, a mission that trains crews but uses fuel and wears down organisation.
- New ships start Green; experience is lost when a ship sinks.
- Heavy losses in a battle can lower a crew's level as replacements come aboard.
- Fleet experience is per ship. **Naval XP**, the national pool spent in the ship designer, is separate.

## Player controls and readability

**In battle:** order a full retreat, change aggressiveness, or send reinforcements from nearby zones. After battle, ships follow their repair status, and organisation recovers in port.

**Readability:** the battle screen shows each line as a row of ship icons with HP and organisation bars, an hourly log, and a post-battle report explaining why things happened (e.g. "Your 6-inch guns could not pierce their battleship belts").

**Auto-resolve:** the same engine runs instantly without the battle screen and powers automated balance testing.

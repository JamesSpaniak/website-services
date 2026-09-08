**Open Decisions:**

Airframe Class – Drone should probably be 3-3.5". Prop guards aren't a bad idea, gives more things to work on in CAD.

Firmware Stack – I like Betaflight, though INAV does have some useful features. Betaflight should be good enough since it does now have GPS hold modes.

Soldering – I feel that it would be valuable for students to be able to solder, though I do understand the risks. We could probably put together curated kits that don't require soldering, but those would be much more expensive and may deter schools.

107 Overlap – I think that relevant regulations should still be covered normally because not all students would necessarily take the 107 class.

Hardware – Again, we could curate kits, but it may be more expensive. Curated no-solder kits would be reusable though.

Video Granularity – While videos are nice, I think that mixed format instructions with very short videos may help retain attention better. Text explanations with 1-2 minute videos of each step.

**Suggested Course Tree:**

| Unit # | Unit Title             | Sessions | Notes                                                                                                                                                                                                                                               |
| ------ | ---------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | Safety                 | 1        | Most safety rules will need to be reiterated anyway, so this should be more general with regards to tools/workshop rather than drone-specific                                                                                                       |
| 2      | Function of Components | 3        | Does not need to explain all inner workings, but the name of each part and its general use, can explain selection of parts such as bat, motors, props dependent on weight/use case                                                                  |
| 3      | Laws                   | 1        | Cover remote ID modules and registration                                                                                                                                                                                                            |
| 4      | Physics                | 5        | Does not need to be as in-depth as 107, but cover wind/weight distribution, stuff relevant to actual building rather than just piloting                                                                                                             |
| 5      | Frame Design           | 5-10     | Even if the students aren't printing their frames, this is an important exercise. Design iterations are important to any engineering field and are not touched on enough in typical high school curriculums.                                        |
| 6      | Assembly               | 3+       | Want to give a good amount of time so that the teacher can help students, less time may be given if there is no soldering. Reiterate building safety.                                                                                               |
| 7      | Software               | 3        | Go over Betaflight webapp, not all areas need to be covered because they are for fine tuning or modules that are not being used here. Students will likely all be using the same hardware, so teacher can provide settings backup if short on time. |
| 8      | Testing                | 10       | This may require design iterations and will reveal mistakes in the assembly, so testing needs to be given a lot of time, plus RPIC is needed.                                                                                                       |

**Unit 1 – Safety**

| Session | Coverage        | Description                                                                         |
| ------- | --------------- | ----------------------------------------------------------------------------------- |
| 1       | Workshop Safety | Not covered by course, should be given according to school.                         |
| 1       | Tools           | Likely only soldering iron and related equipment + screwdriver.                     |
| 1       | Batteries       | Cover safe handling, charging, exposure to heat, should keep secluded until needed. |

More specific safety regarding power-up, software setup, and control can be given at the start of each unit since they are not relevant to the more textbook portions of the course.

**Unit 2 – Function of Components**

| Session | Coverage        | Description                                                                                                                                                                                                                               |
| ------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-2     | Essential Parts | Frame, motors, propellers, ESC, FC, battery, receiver, remote ID (will cover more in law). Can go more in-depth about power in physics section, just make sure students know what each part does, where it goes in the drone, the basics. |
| 3       | Optional Parts  | GPS, camera, VTX, separate vs AIO ESCs. Covers common parts that may also be found on custom drones. Won't necessarily use these parts, but it's helpful to know what they are and the use cases for them.                                |
| 3       | Quiz            | Quick 5-10 minute quiz at the end of class for part and use case identification.                                                                                                                                                          |

Additional parts for legal flight (Remote ID, lights) can be covered under legal section as not all use cases require them.

**Unit 3 – Laws**

| Session | Coverage                 | Description                                                                                                                         |
| ------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Remote ID & Registration | Custom drones will need remote ID module, go through process of obtaining and registering module. Must maintain VLOS.               |
| 1       | Night Lighting           | Custom drones may have some lighting, but additional lights will be needed for night flight, briefly cover visibility requirements. |
| 1       | Quiz                     | Quick 5-10 minute quiz on drone laws.                                                                                               |

Update regularly and include FAA links to ensure course retains current information. Can largely be stolen from 107 slides and quizzes.

**Unit 4 – Physics**

| Session | Coverage        | Description                                                                                                                                                                                                        |
| ------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | Weather         | Custom drones can be more sensitive to weather due to open design, give brief coverage of weather, should not be as in-depth as 107, just enough to be safe.                                                       |
| 2       | Part Placement  | Cover placement of components on a drone for weight distribution, cable management, RC signal strength.                                                                                                            |
| 3       | Load & Strength | Cover common materials (both 3D print and production) and strength design with weight conservation. Provide both production and CAD designs for reference.                                                         |
| 4-5     | Drone Power     | Motor KV, prop size/angle, battery voltage/capacity. Basically the coverage of how a drone generates lift. There are charts covering this subject, can use manufacturer guides for demonstration of lift capacity. |
| 5       | Quiz            | Quick 5-10 minute quiz on drone physics.                                                                                                                                                                           |

Immediately precedes design so information is fresh in the mind. Should make sure students keep access to CAD references for their own designs.

**Unit 5 – Frame Design**

| Session | Coverage     | Description                                                                                                                            |
| ------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1-10    | Frame Design | Give out parts for students to get measurements, not much formal instruction. CAD software is up to school, may already have licenses. |

Design iteration will take a long time. Maybe have mandatory teacher critiques every 2-3 days. If there is no 3D printing then students should design for themselves or in pairs. If 3D printing then perhaps students can work in full groups. If 3D printing then require CAD files be turned in at end of last session for teacher to print. No grading in this portion except for completion, may have voting for best design for extra credit.

**Unit 6 – Assembly**

| Session | Coverage         | Description                                                                                                                                |
| ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | Safety Review    | If soldering, review procedure, live demo.                                                                                                 |
| 1       | ESC              | Attach ESC to frame and connect capacitor and power lead.                                                                                  |
| 2       | Motors           | Attach motors to frame and wires to ESC. Do not attach propellers.                                                                         |
| 2       | FC               | Connect FC to frame and ESC. Likely no need to solder, even basic boards come with FC-ESC connector.                                       |
| 3       | RC Receiver      | Attaching receiver to FC and determining optimal placement.                                                                                |
| 3       | Power On         | First power-on may be attempted with smoke stopper attached. Fix faults.                                                                   |
| 3+      | Additional Parts | If additional parts not listed are used, add them after essential parts have been added. Always used smoke stopper when testing your work. |

If time allows after first power-on, pairing with the controller may be attempted, may only work if FC is preloaded with firmware. May be able to sell higher level kits with the additional parts. If we choose to go this route we can include videos of how to attach them, but otherwise we may want to leave that up to the schools. Graded on completion and possibly safety.

**Unit 7 – Software Setup**

| Session | Coverage           | Description                                                                                                                                                                                           |
| ------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Firmware           | Go over Betaflight firmware installation and have teams follow along.                                                                                                                                 |
| 1       | Communication      | Ensure receiver protocol is set up properly and telemetry is broadcast.                                                                                                                               |
| 2       | Controls           | Will need to enable certain flight modes for first-time pilots. FPV controls will be difficult. May want to have students use a certain throttle curve for safety and they can personally tune later. |
| 3       | Registration & RID | Educational use does not fall under recreational use exception, so drones must be registered and equipped with remote ID module.                                                                      |

Section will be longer if more components are used. Again, only need to cover if additional components are included in kits. Registration done here because we want to know specs of drone and know whether it is functional before registration. Graded on completion.

**Unit 8 – Testing**

| Session | Coverage     | Description                                                                                                                                      |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1-10    | Test Flight  | Number of teams able to test at a time dependent on number of RPICs. Should keep flights short and if a failure occurs must go to back of queue. |
| 1-10    | Modification | Software can be modified while others pilot to due RPIC limitations.                                                                             |

May want to have same days dedicated to physical modification as opposed to testing/software modification. Should have spare known-working frames on standby in case student custom frames do not work. Largest grade of the class, whether drone actually flies. May have elective competitions for speed and lift capacity.

**Assessments**

| When      | Form   | Description                                                                                                                           |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| After U2  | Quiz   | Part and use case identification.                                                                                                     |
| After U3  | Quiz   | Laws and application scenarios, can be taken from 107.                                                                                |
| After U4  | Quiz   | Questions on physics of drone. Can have charts as reference, should not be too hard as real assessment will be from flightworthiness. |
| During U8 | Visual | Check that drone flies and has no immediate safety flaws, bulk of grade.                                                              |

Can include checkpoints for 5-7, no real assessment necessary, but should give points for completion of tasks. May detail checklists for these portions.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sections = [
  // ===== SECTION 1 — DIALOGUES (6 scripts) =====
  {
    test_id: 1,
    section_number: 1,
    title: 'Hotel Room Booking',
    audio_duration_seconds: 270,
    transcript: `RECEPTIONIST: Good morning, Seaside Grand Hotel. How can I help you?
CALLER: Hi, yes, I'd like to book a room, please. My name is Khalid Al-Rashid. That's K-H-A-L-I-D, and the surname is Al-Rashid — A-L dash R-A-S-H-I-D.
RECEPTIONIST: Thank you, Mr. Al-Rashid. And what dates were you looking at?
CALLER: Well, we're arriving on the 14th of March and, um, we'd like to stay for five nights, so that would be checking out on the 19th.
RECEPTIONIST: Right, the 14th to the 19th of March. And how many guests will there be?
CALLER: There'll be two adults and one child. My son — he's seven.
RECEPTIONIST: Lovely. So we have a few room options. There's a standard double at 85 pounds per night, a family suite at 120 pounds, and a deluxe sea-view room at 155 pounds.
CALLER: The family suite sounds ideal, actually. Does it have a separate sleeping area for my son?
RECEPTIONIST: Yes, it does. There's a main bedroom with a double bed and then a smaller room with a single bed and a desk. There's also a sofa bed in the living area if you need it.
CALLER: Perfect. And what about breakfast — is that included?
RECEPTIONIST: Breakfast is included for two adults. For children under ten, it's an additional 8 pounds per day.
CALLER: That's fine. And do you have a swimming pool?
RECEPTIONIST: We do, yes. The pool is open from 7 a.m. to 9 p.m. daily. We also have a gym and a children's play area on the ground floor.
CALLER: Great. Is there parking available? We'll be driving down.
RECEPTIONIST: Yes, we have underground parking. It's 12 pounds per night, or you can use the public car park across the road — that's a bit cheaper, about 6 pounds a day, but it's uncovered.
CALLER: I think we'll go with the hotel parking — much more convenient, especially with luggage.
RECEPTIONIST: Absolutely. Now, could I take a contact number, please?
CALLER: Sure, it's 07745 389 201.
RECEPTIONIST: 07745 389 201. And do you have an email address for the confirmation?
CALLER: Yes, it's khalid.rashid@greenmail.co.uk.
RECEPTIONIST: Got it. So just to confirm — that's a family suite from the 14th to the 19th of March, five nights at 120 pounds per night, so that's 600 pounds total. Plus parking at 12 per night — 60 pounds. And the child's breakfast at 8 per day for five days — 40 pounds. So the grand total comes to 700 pounds.
CALLER: That sounds right. Can I pay when we arrive?
RECEPTIONIST: We do require a deposit of 150 pounds to secure the booking. You can pay the rest on check-in.
CALLER: Fine. I'll pay the deposit by card now, if that's okay?
RECEPTIONIST: Of course. I'll just need your card details...`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'A phone conversation between a hotel receptionist and a caller booking a family room.',
    questions: [
      { number: 1, type: 'form_completion', text: "Guest's surname: __________", instruction: 'Complete the booking form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 2, type: 'form_completion', text: 'Check-in date: __________' },
      { number: 3, type: 'form_completion', text: 'Number of nights: __________' },
      { number: 4, type: 'form_completion', text: 'Room type booked: __________' },
      { number: 5, type: 'form_completion', text: 'Room price per night: £__________' },
      { number: 6, type: 'form_completion', text: "Child's breakfast cost per day: £__________" },
      { number: 7, type: 'form_completion', text: 'Pool opening hours: __________ to 9 p.m.' },
      { number: 8, type: 'form_completion', text: 'Hotel parking cost per night: £__________' },
      { number: 9, type: 'form_completion', text: 'Contact number: __________' },
      { number: 10, type: 'form_completion', text: 'Deposit required: £__________' }
    ],
    answer_key: {
      '1': 'Al-Rashid',
      '2': '14(th) (of) March',
      '3': '5/five',
      '4': 'family suite',
      '5': '120',
      '6': '8',
      '7': '7 a.m./7 am',
      '8': '12',
      '9': '07745 389 201',
      '10': '150'
    },
    sort_order: 1
  },
  {
    test_id: 4,
    section_number: 1,
    title: 'Joining a Gym',
    audio_duration_seconds: 280,
    transcript: `STAFF: Welcome to FitLife Gym. Are you looking to join?
NADIA: Yes, I am. I've just moved to the area and I'm looking for a gym. My name's Nadia — Nadia Hamdan. H-A-M-D-A-N.
STAFF: Welcome, Nadia. Well, let me tell you about our membership options. We have three tiers. The basic membership is 29 pounds a month, which gives you access to the gym floor and the cardio machines. The standard is 45 pounds, and that includes all classes like yoga, spinning, and circuit training. And the premium is 65 pounds, which adds the swimming pool and sauna.
NADIA: I think the standard membership would suit me. I'm really interested in the classes. What kind of classes do you offer?
STAFF: Well, on Mondays and Wednesdays we have yoga at 6:30 in the evening. Spinning is every Tuesday and Thursday morning at 7:15. And circuit training runs on Saturday mornings at 9 o'clock.
NADIA: The yoga classes sound great. Is there a limit on class sizes?
STAFF: Yes, yoga is limited to 20 people per class. We recommend booking online at least a day in advance, especially for the evening sessions — they fill up quickly.
NADIA: Good to know. And, um, what are the gym's opening hours?
STAFF: Monday to Friday, we're open from 6 a.m. to 10 p.m. On Saturdays, it's 7 to 8, and Sundays we're open 8 to 6.
NADIA: That works well for me. I usually like to exercise after work, so around 6 or 7 in the evening. Is there a joining fee?
STAFF: There is — it's normally 50 pounds, but we're running a promotion this month, so the joining fee is waived if you sign up for a minimum of six months.
NADIA: Oh, that's good timing then! I'll definitely commit to six months. Is there a car park?
STAFF: Yes, there's a small car park at the back of the building with about 30 spaces. It's free for members. But during peak hours — roughly 5 to 7 p.m. on weekdays — it does get quite full, so you might want to consider the bus. We're right next to the Wellington Road bus stop.
NADIA: Actually, I live on Park Lane, so I might just walk — it's only about fifteen minutes.
STAFF: Oh, that's perfect. Now, I just need a couple more details. Could I get your date of birth?
NADIA: It's the 3rd of September, 1995.
STAFF: And a contact email?
NADIA: Sure — nadia.hamdan@quickmail.com.
STAFF: Brilliant. And would you like to start today, or...?
NADIA: Could I start from next Monday? The 5th?
STAFF: Absolutely. I'll set your membership to begin on Monday the 5th.`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'A conversation at a gym reception between a staff member and a new member enquiring about membership.',
    questions: [
      { number: 1, type: 'form_completion', text: 'Type of membership chosen: __________', instruction: 'Complete the form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.' },
      { number: 2, type: 'form_completion', text: 'Monthly cost: £__________' },
      { number: 3, type: 'form_completion', text: 'Yoga class days: Mondays and __________' },
      { number: 4, type: 'form_completion', text: 'Yoga class time: __________' },
      { number: 5, type: 'form_completion', text: 'Maximum class size for yoga: __________' },
      { number: 6, type: 'form_completion', text: 'Weekend opening (Saturday): 7 a.m. to __________' },
      { number: 7, type: 'form_completion', text: 'Joining fee: __________' },
      { number: 8, type: 'form_completion', text: "Member's address (street): __________" },
      { number: 9, type: 'form_completion', text: 'Date of birth: __________' },
      { number: 10, type: 'form_completion', text: 'Membership start date: __________' }
    ],
    answer_key: {
      '1': 'standard',
      '2': '45',
      '3': 'Wednesdays',
      '4': '6:30 (p.m./pm/in the evening)',
      '5': '20',
      '6': '8 (p.m./pm)',
      '7': 'waived/free/0',
      '8': 'Park Lane',
      '9': '3(rd) (of) September 1995',
      '10': 'Monday the 5th / the 5th'
    },
    sort_order: 2
  },
  {
    test_id: 2,
    section_number: 1,
    title: 'Renting an Apartment',
    audio_duration_seconds: 275,
    transcript: `AGENT: Hello, City Living Lettings. This is Sarah speaking.
TENANT: Hi Sarah. My name's Omar Farouk. I'm calling about the two-bedroom apartment you have advertised on Maple Street.
AGENT: Oh yes, the Maple Street property. That's a lovely flat. Are you looking for yourself?
TENANT: For myself and my wife, yes. We're relocating from Manchester for work. Could you tell me a bit more about it?
AGENT: Of course. So it's on the third floor of a modern building — built in 2019. Two bedrooms, one bathroom, an open-plan kitchen and living room. There's also a small balcony off the living room.
TENANT: That sounds nice. What about the kitchen — is it furnished?
AGENT: The kitchen comes with all built-in appliances — oven, hob, dishwasher, and a fridge-freezer. The rest of the apartment is unfurnished, though, so you'd need to bring your own furniture.
TENANT: Okay, we have our own furniture anyway. And the rent — the ad said 875 per month?
AGENT: That's right, 875 pounds per month. That includes water charges, but gas and electricity are separate — you'd set those up with your own provider. Internet isn't included either.
TENANT: Right. And is there a deposit?
AGENT: Yes, we require a deposit of six weeks' rent, which comes to, let me see... that's about 1,312 pounds. It's held in a government deposit scheme and returned when you leave, assuming no damage.
TENANT: That's fine. How about transport links? We don't have a car here yet.
AGENT: Well, the nearest tube station is Oakfield — it's about a seven-minute walk. And there are several bus routes along the main road — the 42 and the 78 both stop right outside the building.
TENANT: Perfect. Is there a supermarket nearby?
AGENT: There's a Greenway supermarket about a three-minute walk down the road. And there's a park — Riverside Park — just across the street. Very popular with families and joggers.
TENANT: It sounds ideal. When would the flat be available?
AGENT: It's available from the 1st of April. The current tenants are moving out on the 28th of March, so there'll be a professional clean done before you move in.
TENANT: Could we arrange a viewing this week?
AGENT: Absolutely. How about Thursday at 2 p.m.?
TENANT: Thursday at 2 works perfectly. Could I give you my number? It's 07821 456 330.
AGENT: Got it. We'll see you Thursday, then.`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'A phone call between a letting agent and a prospective tenant enquiring about a rental apartment.',
    questions: [
      { number: 1, type: 'form_completion', text: 'Apartment location: __________ Street', instruction: 'Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.' },
      { number: 2, type: 'form_completion', text: 'Floor: __________' },
      { number: 3, type: 'form_completion', text: 'Year built: __________' },
      { number: 4, type: 'form_completion', text: 'Furnishing: apartment is __________' },
      { number: 5, type: 'form_completion', text: 'Monthly rent: £__________' },
      { number: 6, type: 'form_completion', text: 'Deposit amount: £__________' },
      { number: 7, type: 'form_completion', text: 'Nearest tube station: __________' },
      { number: 8, type: 'form_completion', text: 'Nearby park: __________ Park' },
      { number: 9, type: 'form_completion', text: 'Available from: __________' },
      { number: 10, type: 'form_completion', text: 'Viewing day and time: __________' }
    ],
    answer_key: {
      '1': 'Maple',
      '2': 'third/3rd',
      '3': '2019',
      '4': 'unfurnished',
      '5': '875',
      '6': '1,312/1312',
      '7': 'Oakfield',
      '8': 'Riverside',
      '9': '1st (of) April',
      '10': 'Thursday (at) 2 (p.m./pm)'
    },
    sort_order: 3
  },
  {
    test_id: 5,
    section_number: 1,
    title: 'Registering for a Language Course',
    audio_duration_seconds: 265,
    transcript: `ADMIN: Good morning, Westbridge Language Academy. How can I help?
STUDENT: Hello, I'm interested in enrolling in an English course. I heard you offer different levels?
ADMIN: Yes, that's right. We have beginner, intermediate, and advanced courses. Do you know your current level?
STUDENT: I did an online test last week and it said I'm at intermediate level. My name is Yusuf Al-Tamimi, by the way. Y-U-S-U-F, and the last name is Al-Tamimi — A-L hyphen T-A-M-I-M-I.
ADMIN: Thank you, Yusuf. Our intermediate course is very popular. It runs for 12 weeks and there are two options — morning or evening. The morning sessions are Monday to Thursday, 9 to 12. The evening ones are Tuesday and Thursday, 6 to 9.
STUDENT: I work during the day, so the evening sessions would be better for me.
ADMIN: No problem. The next evening course starts on the 8th of January. Each session is three hours, so you'll get six hours per week. Over 12 weeks, that's 72 hours of instruction.
STUDENT: And what does the course cover?
ADMIN: It focuses on all four skills — reading, writing, listening, and speaking. There's a strong emphasis on speaking and listening, actually, which is about 60 percent of the class time. We also prepare students for the IELTS exam if that's something you're interested in.
STUDENT: Yes, I'm actually planning to take the IELTS in May. That would be really helpful.
ADMIN: Perfect. Now, the course fee is 480 pounds for the full 12 weeks. That includes all materials — textbook, online access, and worksheets. There's also an optional conversation club on Saturdays from 10 to 12. That's free for enrolled students.
STUDENT: Oh, the conversation club sounds useful. Is that with a teacher?
ADMIN: It's led by a teaching assistant and usually has about 8 to 10 students. Very informal — mostly discussion and role-plays.
STUDENT: Great. I'll definitely join that. Where exactly are you located?
ADMIN: We're at 47 Carlton Avenue — that's just behind the central library. The nearest bus stop is on High Street, about a two-minute walk.
STUDENT: And do I need to take a placement test before starting?
ADMIN: Yes, we do require a short placement test — it takes about 30 minutes. You can come in and do it any weekday, or we can send you a link to do it online.
STUDENT: Online would be easier for me.
ADMIN: I'll email you the link today. Could I have your email address?
STUDENT: It's yusuf.tamimi@webpost.net.
ADMIN: Perfect. We'll send that right over.`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'A phone enquiry between a language school administrator and a prospective student registering for an English course.',
    questions: [
      { number: 1, type: 'form_completion', text: 'Course level: __________', instruction: 'Complete the enrolment form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.' },
      { number: 2, type: 'form_completion', text: 'Preferred schedule: __________' },
      { number: 3, type: 'form_completion', text: 'Course start date: __________' },
      { number: 4, type: 'form_completion', text: 'Course duration: __________ weeks' },
      { number: 5, type: 'form_completion', text: 'Hours of instruction per week: __________' },
      { number: 6, type: 'form_completion', text: 'Main emphasis in course: __________ and listening' },
      { number: 7, type: 'form_completion', text: 'Course fee: £__________' },
      { number: 8, type: 'form_completion', text: 'Conversation club day: __________' },
      { number: 9, type: 'form_completion', text: 'School address: 47 __________ Avenue' },
      { number: 10, type: 'form_completion', text: 'Placement test duration: __________ minutes' }
    ],
    answer_key: {
      '1': 'intermediate',
      '2': 'evening',
      '3': '8th (of) January',
      '4': '12',
      '5': '6/six',
      '6': 'speaking',
      '7': '480',
      '8': 'Saturday(s)',
      '9': 'Carlton',
      '10': '30'
    },
    sort_order: 4
  },
  {
    test_id: 3,
    section_number: 1,
    title: 'Making a Restaurant Reservation',
    audio_duration_seconds: 250,
    transcript: `HOST: Thank you for calling The Golden Olive. How may I help you?
CALLER: Hi, I'd like to make a reservation for this Saturday evening, please.
HOST: Certainly. What time were you thinking?
CALLER: Around 7:30, if possible.
HOST: Let me check... yes, we have availability at 7:30. How many guests will there be?
CALLER: There'll be eight of us. It's actually a birthday celebration for my mother.
HOST: How lovely! We have a semi-private dining area that seats up to ten — would that interest you? It has its own entrance and is a bit quieter than the main restaurant.
CALLER: Oh, that sounds perfect. Is there an extra charge for that?
HOST: No extra charge, but we do ask for a minimum spend of 35 pounds per person in that area.
CALLER: That's absolutely fine. Now, I should mention that two of our guests have dietary requirements. My sister is vegetarian, and my uncle has a nut allergy — quite a severe one, actually.
HOST: Thank you for letting us know. Our chef can accommodate both. We have a full vegetarian menu, and all our dishes are clearly labelled for allergens. I'll make a note about the nut allergy so the kitchen is extra careful.
CALLER: That's reassuring. One more thing — would it be possible to bring a birthday cake? We've ordered one from a bakery.
HOST: Of course. Just bring it to the front desk when you arrive and we'll store it in the kitchen. We can bring it out whenever you're ready — we can even add candles if you'd like.
CALLER: That would be wonderful. Could I give you my name for the booking? It's Layla Mansour. L-A-Y-L-A, and Mansour is M-A-N-S-O-U-R.
HOST: Thank you, Ms. Mansour. And a contact number?
CALLER: Yes, 07698 214 553.
HOST: Perfect. So that's Saturday the 22nd, 7:30 p.m., eight guests, semi-private dining area. We look forward to welcoming you.
CALLER: Thank you so much!`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'A phone call to a restaurant to book a table for a birthday celebration.',
    questions: [
      { number: 1, type: 'form_completion', text: 'Day of reservation: __________', instruction: 'Complete the reservation form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.' },
      { number: 2, type: 'form_completion', text: 'Time: __________' },
      { number: 3, type: 'form_completion', text: 'Number of guests: __________' },
      { number: 4, type: 'form_completion', text: 'Occasion: __________' },
      { number: 5, type: 'form_completion', text: 'Seating area: __________' },
      { number: 6, type: 'form_completion', text: 'Minimum spend per person: £__________' },
      { number: 7, type: 'form_completion', text: 'Dietary requirement 1: __________' },
      { number: 8, type: 'form_completion', text: 'Dietary requirement 2: __________ allergy' },
      { number: 9, type: 'form_completion', text: 'Special request: bring a __________' },
      { number: 10, type: 'form_completion', text: 'Contact number: __________' }
    ],
    answer_key: {
      '1': 'Saturday',
      '2': '7:30 (p.m./pm)',
      '3': '8/eight',
      '4': 'birthday (celebration)',
      '5': 'semi-private (dining area)',
      '6': '35',
      '7': 'vegetarian',
      '8': 'nut',
      '9': '(birthday) cake',
      '10': '07698 214 553'
    },
    sort_order: 5
  },
  {
    test_id: 6,
    section_number: 1,
    title: 'Reporting a Lost Item',
    audio_duration_seconds: 255,
    transcript: `OFFICER: Riverside Transport Lost Property Office. How can I help?
CALLER: Hello. I think I left my bag on the train this morning and I'm hoping someone's handed it in.
OFFICER: I'm sorry to hear that. Let me take some details and we'll check. First, can I have your name?
CALLER: It's Ahmed Barakat. That's A-H-M-E-D, and Barakat is B-A-R-A-K-A-T.
OFFICER: Thank you. And which train were you on?
CALLER: It was the 8:15 from Greenfield to Central Station. I got off at Central at about, um, 8:50, I think.
OFFICER: Right, the 8:15 Greenfield service. And where on the train did you leave the bag?
CALLER: I was in coach C — near the front of the train. I was sitting by the window, and I put the bag on the luggage rack above my seat. I only realised it was missing when I got to work.
OFFICER: Can you describe the bag for me?
CALLER: Yes, it's a dark brown leather briefcase. It's quite old, actually — it has my initials on the front, A.B., in gold letters.
OFFICER: Dark brown leather with gold initials. And can you tell me what was inside?
CALLER: Well, there's a laptop — a silver Lenovo — and some work documents. Oh, and my reading glasses — they're in a black case. There's also a small notebook with a green cover, and, um, my house keys on a keyring with a small compass attached to it.
OFFICER: Okay, I've noted all that. Let me just check our system... Actually, yes! We do have a brown leather briefcase that was handed in from the 8:15 service this morning. The description matches.
CALLER: Oh, that's such a relief!
OFFICER: You can collect it from our office at Central Station — we're on the lower level, next to platform 12. We're open until 6 p.m. today. You'll need to bring photo identification — a passport or driving licence.
CALLER: I'll come straight after work. I finish at 5, so I should be there by about 5:30.
OFFICER: That's fine. If you can't make it today, we hold items for 30 days before they go to general lost property.
CALLER: No, I'll definitely come today. Thank you so much — you've made my day!`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'A phone call to a lost property office to report and recover a bag left on a train.',
    questions: [
      { number: 1, type: 'form_completion', text: "Caller's surname: __________", instruction: 'Complete the lost property report. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.' },
      { number: 2, type: 'form_completion', text: 'Train departure time: __________' },
      { number: 3, type: 'form_completion', text: 'Departed from: __________' },
      { number: 4, type: 'form_completion', text: 'Seat location: coach __________' },
      { number: 5, type: 'form_completion', text: 'Bag placed on: __________' },
      { number: 6, type: 'form_completion', text: 'Bag description: dark brown __________' },
      { number: 7, type: 'form_completion', text: 'Laptop brand: __________' },
      { number: 8, type: 'form_completion', text: 'Keyring has a small __________ attached' },
      { number: 9, type: 'form_completion', text: 'Collection location: next to platform __________' },
      { number: 10, type: 'form_completion', text: 'Items held for: __________ days' }
    ],
    answer_key: {
      '1': 'Barakat',
      '2': '8:15',
      '3': 'Greenfield',
      '4': 'C',
      '5': 'luggage rack',
      '6': 'leather briefcase',
      '7': 'Lenovo',
      '8': 'compass',
      '9': '12',
      '10': '30'
    },
    sort_order: 6
  },
  // ===== SECTION 2 — MONOLOGUES (6 scripts) =====
  {
    test_id: 1,
    section_number: 2,
    title: 'University Orientation Welcome Talk',
    audio_duration_seconds: 290,
    transcript: `Good morning, everyone, and welcome to Ashford University. My name is Dr. Helen Crawford, and I'm the Dean of Student Affairs. I'd like to take a few minutes to help you find your way around the campus and tell you about some of the services available to you as new students.

First, let me give you a brief overview of the campus layout. We're currently in the Main Hall, which is building A on your campus map. Directly opposite us, across the central courtyard, is the library — that's building D. The library is open seven days a week: Monday to Friday from 8 a.m. to midnight, and on weekends from 9 to 8. You'll find over 200,000 books and journals there, plus 150 computer workstations.

To the left of the library is the Science Block — building E — where most laboratory sessions take place. And to the right of the library, you'll see the Arts Centre — building F — which houses the theatre, music rooms, and exhibition spaces. The Student Union building is just behind the Main Hall — building B. That's where you'll find the cafeteria, the student shop, and various club offices.

Now, let me mention some important support services. The Academic Support Centre, located on the second floor of the library, offers free tutoring in writing, mathematics, and study skills. Drop-in sessions are available every afternoon from 2 to 5, and you can book one-to-one appointments online.

Health and wellbeing services are based in the Wellbeing Hub — building G — near the sports centre. You can see a nurse without an appointment on weekday mornings, and counselling sessions are available by booking — usually within three working days.

For those of you living on campus, the accommodation office is in building C, next to the Student Union. They handle everything from room allocations to maintenance requests. If you have any issues with your accommodation, that's your first port of call.

Finally, I'd like to remind you about the Welcome Week activities. Tomorrow, there's a campus tour starting from this hall at 10 a.m. — I really encourage you to join that. On Wednesday, there's the Clubs and Societies Fair in the sports hall from 12 to 4. Over 80 clubs will be represented, so it's a great way to meet people and find your community. And on Friday, we're hosting an international food festival in the central courtyard from 5 to 9 p.m.

If you have any questions at all during your first few weeks, please don't hesitate to contact the Student Affairs team. Our office is on the ground floor of building A — right here — and we're open 9 to 5, Monday to Friday. Welcome again, and I hope you have a fantastic time at Ashford.`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'A welcome talk by the Dean of Student Affairs at a university orientation for new students.',
    questions: [
      { number: 1, type: 'mcq', text: 'The Main Hall is labelled as which building on the map?', options: ['A', 'B', 'C', 'D'] },
      { number: 2, type: 'mcq', text: 'The library is open on weekdays until:', options: ['8 p.m.', '10 p.m.', 'midnight', '9 p.m.'] },
      { number: 3, type: 'matching', text: 'The Science Block is __________ the library.', options: ['to the left of', 'to the right of', 'behind', 'opposite'] },
      { number: 4, type: 'form_completion', text: 'Number of computer workstations in library: __________' },
      { number: 5, type: 'form_completion', text: 'Academic Support Centre location: __________ floor of the library' },
      { number: 6, type: 'form_completion', text: 'Drop-in tutoring hours: __________ to 5 p.m.' },
      { number: 7, type: 'mcq', text: 'Counselling appointments are usually available within:', options: ['one day', 'three working days', 'one week', 'two weeks'] },
      { number: 8, type: 'form_completion', text: 'Clubs and Societies Fair day: __________' },
      { number: 9, type: 'form_completion', text: 'Number of clubs at the fair: over __________' },
      { number: 10, type: 'form_completion', text: 'International food festival time: __________ to 9 p.m.' }
    ],
    answer_key: {
      '1': 'A',
      '2': 'midnight',
      '3': 'to the left of',
      '4': '150',
      '5': 'second/2nd',
      '6': '2 (p.m./pm)',
      '7': 'three working days',
      '8': 'Wednesday',
      '9': '80',
      '10': '5 (p.m./pm)'
    },
    sort_order: 7
  },
  {
    test_id: 4,
    section_number: 2,
    title: 'Museum Tour Guide Introduction',
    audio_duration_seconds: 280,
    transcript: `Good afternoon, everyone, and welcome to the National Discovery Museum. My name is James, and I'll be your guide for today's tour, which will last approximately 90 minutes.

Before we set off, let me give you a quick overview of the museum layout. We're currently standing in the Grand Foyer, which is the central hub connecting all the galleries. The museum has five main galleries arranged around this foyer.

To our left is Gallery One — the Natural World. This is our largest gallery, and it contains our famous collection of dinosaur fossils, including a complete skeleton of a Diplodocus that was discovered in Montana in 1923. It's one of only six complete specimens in the world.

Straight ahead, through the glass doors, is Gallery Two — Ancient Civilisations. This gallery houses artefacts from Egypt, Mesopotamia, and the Indus Valley. The centrepiece is a collection of gold jewellery from a royal tomb dating back over 4,500 years.

To our right is Gallery Three — Science and Innovation. This is our most interactive space, with over 40 hands-on exhibits. It's particularly popular with younger visitors. You can try everything from building bridges to generating electricity on a bicycle.

Upstairs on the first floor, we have Gallery Four — Art and Culture — featuring rotating exhibitions. The current exhibition, which opened just last week, is called "Light and Shadow" and explores the use of light in photography from the 1840s to the present day. It runs until the 30th of April.

Also on the first floor is Gallery Five — the Space Gallery — with a full-scale replica of the first satellite and a planetarium. The planetarium shows run every hour on the hour, and each show lasts about 25 minutes. I'd highly recommend catching the 3 o'clock show if you can — it's about the formation of galaxies and the reviews have been excellent.

A few practical points: photography is allowed in all galleries except Gallery Two, where the lighting conditions for the ancient artefacts must be carefully controlled. There's a café on the ground floor, next to the gift shop, open until 5:30. And the museum closes at 6 p.m. today.

Our tour will start in Gallery One. We'll spend about 20 minutes there, then move through Galleries Two and Three before heading upstairs. Ready? Let's begin.`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'A museum tour guide introducing the museum layout and exhibits to a group of visitors.',
    questions: [
      { number: 1, type: 'form_completion', text: 'Tour duration: approximately __________ minutes', instruction: 'Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.' },
      { number: 2, type: 'matching', text: 'Gallery One (Natural World) is located:', options: ['to the left', 'straight ahead', 'to the right', 'upstairs'] },
      { number: 3, type: 'form_completion', text: 'Famous exhibit in Gallery One: complete __________ skeleton' },
      { number: 4, type: 'form_completion', text: 'Centrepiece of Gallery Two: collection of __________ jewellery' },
      { number: 5, type: 'form_completion', text: 'Number of hands-on exhibits in Gallery Three: over __________' },
      { number: 6, type: 'form_completion', text: 'Current exhibition name: "__________"' },
      { number: 7, type: 'form_completion', text: 'Exhibition closing date: __________' },
      { number: 8, type: 'form_completion', text: 'Planetarium show duration: __________ minutes' },
      { number: 9, type: 'mcq', text: 'Photography is NOT allowed in:', options: ['Gallery One', 'Gallery Two', 'Gallery Three', 'Gallery Five'] },
      { number: 10, type: 'form_completion', text: 'Museum closing time today: __________' }
    ],
    answer_key: {
      '1': '90',
      '2': 'to the left',
      '3': 'Diplodocus',
      '4': 'gold',
      '5': '40',
      '6': 'Light and Shadow',
      '7': '30th (of) April',
      '8': '25',
      '9': 'Gallery Two',
      '10': '6 (p.m./pm)'
    },
    sort_order: 8
  },
  {
    test_id: 2,
    section_number: 2,
    title: 'Local Festival Radio Announcement',
    audio_duration_seconds: 270,
    transcript: `And now for some exciting community news. The annual Riverdale Summer Festival is just around the corner, and this year's event promises to be the biggest and best yet. I'm Karen Mitchell from the festival organising committee, and I'm here to give you all the details.

The festival takes place over three days — Friday the 15th to Sunday the 17th of August — at Riverdale Park, next to the Community Sports Centre. Gates open at 10 a.m. each day and the festival runs until 10 p.m. on Friday and Saturday, and until 8 p.m. on Sunday.

This year, we've expanded the festival to include five themed zones. The main stage area will host live music performances throughout each day. On Friday evening, we have the Westwood Jazz Ensemble — they were a huge hit last year, so we've invited them back. Saturday's headline act is local band The Harbour Lights, and Sunday features a classical performance by the City Youth Orchestra.

The food zone is bigger than ever, with over 25 vendors representing cuisines from around the world. We're particularly excited about the new "Taste of Arabia" section, which will feature traditional dishes from across the Middle East, including fresh falafel, shawarma, and handmade pastries.

For families, we have the Children's Adventure Zone with face painting, puppet shows, and a mini obstacle course. There's also a new addition this year — a dedicated craft market in Zone Four, where local artisans will be selling handmade pottery, textiles, and jewellery. If you're interested in learning a new skill, there are free craft workshops running every afternoon from 2 to 4.

Zone Five is our Wellness Area, offering free yoga sessions at 9 a.m. each morning before the festival officially opens — so do come early for that. There's also a first aid station located next to the Wellness Area, staffed by qualified paramedics throughout the festival.

Now, about tickets. Advance tickets are available online at riverdalefestival.org and cost 8 pounds per day for adults. Children under 12 go free. If you buy at the gate, it's 12 pounds. We also offer a three-day pass for 20 pounds — that's a significant saving. Parking is available at the Sports Centre car park for 5 pounds per day, but we strongly encourage using public transport. The number 15 bus stops directly outside the park gates.

We're expecting around 5,000 visitors each day, so it's going to be a fantastic atmosphere. See you there!`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'A radio announcement by a festival organiser providing details about an upcoming community festival.',
    questions: [
      { number: 1, type: 'form_completion', text: 'Festival dates: 15th to __________ of August', instruction: 'Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.' },
      { number: 2, type: 'form_completion', text: 'Festival location: __________ Park' },
      { number: 3, type: 'form_completion', text: 'Sunday closing time: __________' },
      { number: 4, type: 'form_completion', text: 'Friday evening act: __________' },
      { number: 5, type: 'form_completion', text: 'Number of food vendors: over __________' },
      { number: 6, type: 'form_completion', text: 'Zone Four features: craft __________' },
      { number: 7, type: 'form_completion', text: 'Free craft workshops: __________ to 4 p.m.' },
      { number: 8, type: 'form_completion', text: 'Yoga sessions start at: __________' },
      { number: 9, type: 'form_completion', text: 'Advance adult ticket price: £__________' },
      { number: 10, type: 'form_completion', text: 'Three-day pass price: £__________' }
    ],
    answer_key: {
      '1': '17th',
      '2': 'Riverdale',
      '3': '8 (p.m./pm)',
      '4': 'Westwood Jazz Ensemble',
      '5': '25',
      '6': 'market',
      '7': '2 (p.m./pm)',
      '8': '9 (a.m./am)',
      '9': '8',
      '10': '20'
    },
    sort_order: 9
  },
  {
    test_id: 5,
    section_number: 2,
    title: 'New Community Centre Presentation',
    audio_duration_seconds: 275,
    transcript: `Thank you all for coming to this public meeting. My name is Councillor David Park, and I'm delighted to present the plans for our new Brookside Community Centre, which is scheduled to open in September of next year.

The centre will be built on the site of the old Brookside car park on Victoria Road. The total construction cost is estimated at 3.2 million pounds, funded partly by the council and partly by a government regeneration grant.

Let me walk you through the facilities. The ground floor will house a large multi-purpose hall that can seat up to 250 people. This space can be used for concerts, community meetings, wedding receptions, and exhibitions. There'll be a movable partition wall so the hall can be divided into two smaller spaces when needed.

Also on the ground floor, there'll be a modern café with seating for 60 people, serving hot meals, sandwiches, and beverages throughout the day. Next to the café is a dedicated youth area with gaming consoles, table tennis, and a study zone with free Wi-Fi. This was one of the most requested features in our community survey — 78 percent of respondents said they wanted better facilities for young people.

On the first floor, we've planned four meeting rooms of varying sizes — the smallest seats 8 people and the largest seats 30. These can be booked by local businesses, charities, and community groups. There's also a computer suite with 20 workstations, offering free internet access and digital skills training for residents.

The second floor is entirely dedicated to health and fitness. There'll be a fully equipped gym, a dance studio, and two activity rooms for yoga, martial arts, and similar classes. We've partnered with FitWell Health to manage the gym, and memberships will be offered at subsidised rates for local residents — starting from just 15 pounds per month.

Outside, there'll be a landscaped garden with benches and a children's play area. We're also creating 45 parking spaces, including 6 disabled spaces, and secure bicycle storage for 30 bikes.

The centre will be open seven days a week — Monday to Saturday from 7 a.m. to 10 p.m., and Sundays from 9 a.m. to 6 p.m.

We're currently at the planning consultation stage, and I'd love to hear your thoughts. There are feedback forms at the back of the room, or you can email your comments to community@brookside.gov.uk by the 28th of February.`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'A councillor presenting plans for a new community centre at a public meeting.',
    questions: [
      { number: 1, type: 'form_completion', text: 'Planned opening: September __________', instruction: 'Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.' },
      { number: 2, type: 'form_completion', text: 'Location: __________ Road' },
      { number: 3, type: 'form_completion', text: 'Construction cost: £__________ million' },
      { number: 4, type: 'form_completion', text: 'Multi-purpose hall capacity: up to __________ people' },
      { number: 5, type: 'form_completion', text: 'Percentage wanting youth facilities: __________%' },
      { number: 6, type: 'form_completion', text: 'Largest meeting room seats: __________ people' },
      { number: 7, type: 'form_completion', text: 'Computer suite workstations: __________' },
      { number: 8, type: 'form_completion', text: 'Gym membership starting from: £__________ per month' },
      { number: 9, type: 'form_completion', text: 'Total parking spaces: __________' },
      { number: 10, type: 'form_completion', text: 'Feedback deadline: __________' }
    ],
    answer_key: {
      '1': 'next year',
      '2': 'Victoria',
      '3': '3.2',
      '4': '250',
      '5': '78',
      '6': '30',
      '7': '20',
      '8': '15',
      '9': '45',
      '10': '28th (of) February'
    },
    sort_order: 10
  },
  {
    test_id: 3,
    section_number: 2,
    title: 'Historical City Walking Tour',
    audio_duration_seconds: 285,
    transcript: `Welcome, everyone, to the Oldtown Heritage Walking Tour. I'm Patricia, and I've been leading these tours for about 12 years now, so I know every stone and story in this beautiful city.

Our walk today will take about two hours and covers approximately 3 kilometres, so I hope you're wearing comfortable shoes. We'll be visiting six key landmarks, starting here at the Market Square and finishing at the Harbour.

So, let's begin right where we're standing — the Market Square. This square has been the heart of Oldtown since the 13th century. The weekly market has been held here every Wednesday for over 700 years without interruption — even during wartime. The cobblestones you're walking on were laid in 1847 and have been carefully maintained ever since.

If you look to your right, you'll see the Town Hall — that impressive building with the clock tower. It was designed by architect Sir Robert Whitfield and completed in 1892. The clock tower stands at 42 metres tall and was, for many years, the tallest structure in the region. The bell, which weighs nearly two tonnes, still chimes every hour.

Now, if you'll follow me down this narrow lane — this is Merchants' Lane, one of the oldest streets in the city. Notice how the buildings lean slightly inward at the top — that's a feature of medieval construction. The buildings on this street date from the 15th and 16th centuries and were originally home to wealthy wool merchants.

We're now approaching St. Catherine's Church, our third stop. This church was built between 1340 and 1385 and is considered one of the finest examples of Gothic architecture in the country. The stained glass windows are particularly noteworthy — they were created by a local craftsman named Thomas Elwood in 1412 and have survived remarkably well.

Continuing down the hill, we come to the Old Bridge. This stone bridge was constructed in 1567 to replace an earlier wooden crossing that was destroyed in a flood. It has five arches and stretches 65 metres across the River Avon. In the 18th century, small shops were built along both sides of the bridge, and two of them still operate today — a bookshop and a tea room.

Our next stop will be the Castle Ruins, which are about a five-minute walk from here. The castle was built in 1086, shortly after the Norman invasion, and was home to the Earl of Oldtown for nearly 400 years. Although much of the castle was destroyed during a siege in 1485, the main gatehouse and parts of the outer wall remain standing.

Our final stop will be the Harbour, which transformed Oldtown from a small market town into a major trading port in the 1600s. Today, it's a charming area with restaurants, galleries, and boat trips along the coast.

Follow me, and please do ask questions as we go.`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'A heritage walking tour guide describing landmarks and history of a historical city.',
    questions: [
      { number: 1, type: 'form_completion', text: 'Tour duration: approximately __________ hours', instruction: 'Complete the notes. Write NO MORE THAN THREE WORDS AND/OR A NUMBER.' },
      { number: 2, type: 'form_completion', text: 'Market day: every __________' },
      { number: 3, type: 'form_completion', text: 'Town Hall architect: Sir Robert __________' },
      { number: 4, type: 'form_completion', text: 'Clock tower height: __________ metres' },
      { number: 5, type: 'form_completion', text: "Merchants' Lane residents were originally: __________ merchants" },
      { number: 6, type: 'form_completion', text: 'Church windows created by: Thomas __________' },
      { number: 7, type: 'form_completion', text: 'Old Bridge has __________ arches' },
      { number: 8, type: 'form_completion', text: 'Bridge length: __________ metres' },
      { number: 9, type: 'form_completion', text: 'Castle built in year: __________' },
      { number: 10, type: 'form_completion', text: 'Castle partly destroyed during a __________' }
    ],
    answer_key: {
      '1': '2/two',
      '2': 'Wednesday',
      '3': 'Whitfield',
      '4': '42',
      '5': 'wool',
      '6': 'Elwood',
      '7': '5/five',
      '8': '65',
      '9': '1086',
      '10': 'siege'
    },
    sort_order: 11
  },
  {
    test_id: 6,
    section_number: 2,
    title: 'Library Services and Rules',
    audio_duration_seconds: 270,
    transcript: `Hello, everyone. I'm Margaret Chen, the head librarian here at Westfield Public Library, and I'd like to welcome you to our new members' induction session. I'll go through our services, facilities, and a few important rules.

First, your library card. Each member receives a free library card which gives you access to all our services. You can borrow up to 12 items at a time — that includes books, DVDs, and audiobooks. The standard loan period for books is three weeks, and for DVDs it's one week. You can renew items up to two times, either online, by phone, or in person, as long as no one else has reserved them.

Overdue fines — I know, nobody's favourite topic. For books, the fine is 20 pence per day, up to a maximum of 5 pounds per item. DVDs have a higher rate of 50 pence per day. But here's the good news — we run an amnesty week twice a year, usually in March and September, when all overdue fines are waived if you return the items.

Now, let me tell you about our facilities. The ground floor is where you'll find the main lending collection — fiction, non-fiction, and the children's section. The children's area has a dedicated story time every Saturday morning at 10:30, for ages 3 to 7. We also have a Young Adults section with books and graphic novels for teenagers.

On the first floor, we have the Reference Section, which includes newspapers, academic journals, and local history archives. These materials cannot be borrowed but can be used within the library. We also have a quiet study area with 24 individual desks — this is a silent zone, so please no phone calls or group discussions there.

The second floor houses our digital hub — 15 public computers with free internet access and printing facilities. Printing costs 10 pence per black-and-white page and 25 pence for colour. There are also four bookable meeting rooms on this floor, available free of charge for community groups. You can reserve a room up to two weeks in advance through our website.

A couple of important rules. Food is not permitted in any area of the library, but you may bring drinks in sealed containers. Mobile phones should be on silent at all times, and please take calls outside the building. And finally, if you'd like to use the Wi-Fi, the password is on display at the reception desk — it changes monthly for security reasons.

Our opening hours are Monday to Friday, 9 a.m. to 7 p.m., and Saturday 9 to 5. We're closed on Sundays.

If you have any questions about our services or need help finding anything, please ask any member of staff. We're always happy to help. Thank you.`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'A head librarian explaining library services, facilities, and rules during a new members induction.',
    questions: [
      { number: 1, type: 'form_completion', text: 'Maximum items borrowed at once: __________', instruction: 'Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.' },
      { number: 2, type: 'form_completion', text: 'Book loan period: __________ weeks' },
      { number: 3, type: 'form_completion', text: 'DVD loan period: __________ week(s)' },
      { number: 4, type: 'form_completion', text: 'Book overdue fine: __________ per day' },
      { number: 5, type: 'form_completion', text: 'Amnesty week months: March and __________' },
      { number: 6, type: 'form_completion', text: 'Story time day and time: Saturday at __________' },
      { number: 7, type: 'form_completion', text: 'Quiet study area desks: __________' },
      { number: 8, type: 'form_completion', text: 'Colour printing cost: __________ per page' },
      { number: 9, type: 'form_completion', text: 'Meeting rooms can be booked __________ in advance' },
      { number: 10, type: 'form_completion', text: 'Saturday closing time: __________' }
    ],
    answer_key: {
      '1': '12',
      '2': '3/three',
      '3': '1/one',
      '4': '20 pence/20p',
      '5': 'September',
      '6': '10:30',
      '7': '24',
      '8': '25 pence/25p',
      '9': '(up to) two weeks/2 weeks',
      '10': '5 (p.m./pm)'
    },
    sort_order: 12
  }
];

async function main() {
  console.log('Inserting 12 Listening Sections 1-2...');

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const { data, error } = await supabase.from('ielts_listening_sections').insert(section).select('id, title, section_number');
    if (error) {
      console.log(`❌ Section ${i+1} error:`, error.message);
    } else {
      console.log(`✅ S${data[0].section_number}: ${data[0].title}`);
    }
  }

  const { data: all } = await supabase.from('ielts_listening_sections').select('id, section_number, title').order('sort_order');
  console.log(`\n🎧 Total listening sections: ${all?.length}`);
  const s1 = all?.filter(s => s.section_number === 1).length;
  const s2 = all?.filter(s => s.section_number === 2).length;
  console.log(`  Section 1 (dialogues): ${s1}`);
  console.log(`  Section 2 (monologues): ${s2}`);
}

main().catch(console.error);

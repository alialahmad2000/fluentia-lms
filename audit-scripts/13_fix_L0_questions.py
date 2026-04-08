#!/usr/bin/env python3
"""
PROMPT 13-FIX-L0-Q — Rewrite all 120 L0 comprehension questions.
Maps new questions to existing question IDs, preserving question_type and sort_order.
"""
import json, subprocess, sys, os

ROOT = "C:/Users/Dr. Ali/Desktop/fluentia-lms"
CLEANUP = os.path.join(ROOT, "PHASE-2-CLEANUP")

# All 120 new questions keyed by existing question UUID
# Format: {question_id: {question_en, choices, correct_answer}}
# Each passage has 5 questions matching the rewritten passage content.

NEW_QUESTIONS = {
    # ================================================================
    # U01_A: "A Day in Riyadh"
    # Passage: Riyadh big capital city, people drive/bus, streets busy,
    #   shops/restaurants for lunch, evening beautiful, families walk parks,
    #   children play, drink tea, interesting every day.
    # ================================================================
    # sort 0: main_idea
    "2fb184ab-f054-4ad9-8a9b-9d2b997e7d25": {
        "question_en": "What is the passage about?",
        "choices": ["Life in Riyadh", "Food in Saudi Arabia", "Schools in the city"],
        "correct_answer": "Life in Riyadh",
    },
    # sort 1: detail
    "a72fc812-7897-4673-8328-1242aab5fbe9": {
        "question_en": "How do some people go to work?",
        "choices": ["They drive or take the bus", "They ride a bike", "They walk to work"],
        "correct_answer": "They drive or take the bus",
    },
    # sort 2: vocabulary
    "e2177507-6961-4b65-af9c-a2acd03a6039": {
        "question_en": "What does 'capital' mean in the passage?",
        "choices": ["The most important city", "A small town", "A new place"],
        "correct_answer": "The most important city",
    },
    # sort 3: detail
    "7fa178de-b53f-4f54-ade4-76cbd248f22d": {
        "question_en": "What do families do in the evening?",
        "choices": ["Go to parks and walk", "Go to school", "Go to work"],
        "correct_answer": "Go to parks and walk",
    },
    # sort 4: inference
    "ab739da6-e74d-4d5c-ac61-a856811d4c88": {
        "question_en": "Why are the streets busy with many cars?",
        "choices": ["Many people drive to work", "There is a party", "The streets are new"],
        "correct_answer": "Many people drive to work",
    },

    # ================================================================
    # U01_B: "Morning Routines Around the World"
    # Passage: People have morning routines. Saudi Arabia wake early.
    #   Eat breakfast, tea/coffee. Some exercise, run/walk. Read/study.
    #   Good routine helps feel happy. Work in office or home.
    # ================================================================
    "af050dcc-82ec-44f2-9b2b-a7e8acf04a18": {
        "question_en": "What is this passage about?",
        "choices": ["Morning routines", "Evening plans", "Cooking food"],
        "correct_answer": "Morning routines",
    },
    "9b86b1b7-81bb-4b38-bf48-f8f7d3e6e82b": {
        "question_en": "What do people in Saudi Arabia eat in the morning?",
        "choices": ["Breakfast with tea or coffee", "Lunch with rice", "Dinner with meat"],
        "correct_answer": "Breakfast with tea or coffee",
    },
    "984284ef-1ebc-4aab-bf2c-27e0e19e5e17": {
        "question_en": "What does 'exercise' mean?",
        "choices": ["Move your body to stay strong", "Eat a big meal", "Sleep for a long time"],
        "correct_answer": "Move your body to stay strong",
    },
    "bc97e91e-93eb-4cc5-a6b4-e3a51fce99ed": {
        "question_en": "Where do some people work?",
        "choices": ["In an office or at home", "At a farm", "At a park"],
        "correct_answer": "In an office or at home",
    },
    "05994cbe-e3ea-4698-acf3-ab8e98e89f97": {
        "question_en": "Why does a good routine help you?",
        "choices": ["It helps you feel happy and ready", "It makes you tired", "It gives you money"],
        "correct_answer": "It helps you feel happy and ready",
    },

    # ================================================================
    # U02_A: "Food in Saudi Arabia"
    # Passage: Saudi food delicious. Rice and meat. Big dish with spices.
    #   Breakfast: bread, cheese, coffee/tea, eggs, vegetables.
    #   Cook at home or restaurants. Families eat and talk.
    # ================================================================
    "056e1c2d-b56a-4e71-b38d-7eb76a0ad86c": {
        "question_en": "What is this passage about?",
        "choices": ["Food in Saudi Arabia", "Sports in the city", "Animals on a farm"],
        "correct_answer": "Food in Saudi Arabia",
    },
    "a7659638-40c2-4e96-b42d-45f2d1c8a38e": {
        "question_en": "What do people eat for breakfast?",
        "choices": ["Bread and cheese", "Rice and meat", "Fish and eggs"],
        "correct_answer": "Bread and cheese",
    },
    "06c4609c-e1b5-4ba1-b77a-3f2c29d8b08e": {
        "question_en": "What do people drink with breakfast?",
        "choices": ["Coffee or tea", "Juice", "Water"],
        "correct_answer": "Coffee or tea",
    },
    "2c28563e-f2d7-491c-a4d3-ecb6b7fa9c31": {
        "question_en": "What does 'delicious' mean?",
        "choices": ["Very good to eat", "Very big", "Very fast"],
        "correct_answer": "Very good to eat",
    },
    "105c254d-f7e5-4ab3-b2eb-5f44c0d8e9a7": {
        "question_en": "Why do families like to eat together?",
        "choices": ["It makes them happy", "They have no food at home", "They like to cook alone"],
        "correct_answer": "It makes them happy",
    },

    # ================================================================
    # U02_B: "Cooking at Home"
    # Passage: Cooking fun. Buy ingredients: vegetables, meat, spices, rice, bread.
    #   Prepare: wash vegetables, cut. Cook meat with spices. Kitchen smells good.
    #   Food ready on plate. Cooking for family makes happy.
    # ================================================================
    "edc2457c-7b9e-4c08-a35d-6a8f3d72e1b4": {
        "question_en": "What is the passage about?",
        "choices": ["Cooking at home", "Shopping for clothes", "Going to school"],
        "correct_answer": "Cooking at home",
    },
    "bd614cf1-3d5e-4a7c-b812-9e6f5c8d0a23": {
        "question_en": "Where do you buy ingredients?",
        "choices": ["From the shop", "From the park", "From school"],
        "correct_answer": "From the shop",
    },
    "94732493-2a1e-4d8f-b956-7c3e0f4a5b18": {
        "question_en": "What does 'ingredients' mean?",
        "choices": ["Things you need to cook", "Types of animals", "Names of people"],
        "correct_answer": "Things you need to cook",
    },
    "10c4076a-8e9d-4b71-a423-5d6f7c0e8b39": {
        "question_en": "What do you do with the vegetables?",
        "choices": ["Wash and cut them", "Throw them away", "Put them in water"],
        "correct_answer": "Wash and cut them",
    },
    "a60c2380-4f1e-4c6a-b789-0e2d3a5c7f41": {
        "question_en": "Why does cooking for family make you happy?",
        "choices": ["Because everyone eats good food together", "Because cooking is hard", "Because the kitchen is big"],
        "correct_answer": "Because everyone eats good food together",
    },

    # ================================================================
    # U03_A: "My City"
    # Passage: Live in city. Buildings, streets, shops, restaurants, parks.
    #   Market busy. Morning: work/school. Cars, buses. Walk to shops.
    #   Beautiful place. People nice and friendly. Love my city.
    # ================================================================
    "9b6a92c5-d1e4-4f8a-b357-2c6e9a0d5b74": {
        "question_en": "What is this passage about?",
        "choices": ["A person and their city", "A day at school", "A trip to the farm"],
        "correct_answer": "A person and their city",
    },
    "6d291973-a4c8-4e5b-b961-0f3d8a7e2c49": {
        "question_en": "What is in the city?",
        "choices": ["Shops, restaurants, and parks", "Only houses", "Only schools"],
        "correct_answer": "Shops, restaurants, and parks",
    },
    "446c8233-b7d9-4a1e-c582-3e6f0d4a8b57": {
        "question_en": "What does 'beautiful' mean?",
        "choices": ["Very nice to look at", "Very old", "Very small"],
        "correct_answer": "Very nice to look at",
    },
    "d6a0c256-e8f1-4b3a-a974-5c7d2e0f6b81": {
        "question_en": "What do people do in the morning?",
        "choices": ["Go to work and school", "Sleep all day", "Go to the park"],
        "correct_answer": "Go to work and school",
    },
    "ac099b07-f2d3-4c6e-b845-1a9e7d0c3f62": {
        "question_en": "Why does the person love their city?",
        "choices": ["The people are nice and friendly", "The city is very small", "There is no market"],
        "correct_answer": "The people are nice and friendly",
    },

    # ================================================================
    # U03_B: "Getting Around the City"
    # Passage: Many ways to move. Drive, bus, taxi, walk. Streets busy morning.
    #   Traffic slow. Leave home early. Walking good for body.
    #   See buildings and shops. Nice way to see city.
    # ================================================================
    "a93318f0-c4e5-4b7a-a136-8d2f0e9a3c51": {
        "question_en": "What is the main idea?",
        "choices": ["Ways to move around the city", "How to cook food", "Animals in the park"],
        "correct_answer": "Ways to move around the city",
    },
    "ceb62f25-d5f1-4a8e-b247-9e3c0f6a1d72": {
        "question_en": "Why are the streets busy in the morning?",
        "choices": ["Many people go to work", "People are sleeping", "The shops are closed"],
        "correct_answer": "Many people go to work",
    },
    "db7d1339-e6a2-4c9f-b358-0f4d1a7e2c83": {
        "question_en": "What does 'traffic' mean?",
        "choices": ["Cars moving on the road", "People in a shop", "Food on a plate"],
        "correct_answer": "Cars moving on the road",
    },
    "4fd04835-f7b3-4d1e-c469-1a5e2c8f0d94": {
        "question_en": "What is good about walking?",
        "choices": ["It is good for your body", "It is very fast", "It costs money"],
        "correct_answer": "It is good for your body",
    },
    "3ea49ea7-a8c4-4e2f-b571-2d6f3a9e0c15": {
        "question_en": "Why should you leave home early?",
        "choices": ["So you are not late", "Because the park opens early", "To buy food first"],
        "correct_answer": "So you are not late",
    },

    # ================================================================
    # U04_A: "Animals Around Us"
    # Passage: Animals all around. Some live in homes. Cats/dogs popular pets.
    #   Give food/water. Birds fly, fish swim. Big and small.
    #   Animals help people. Fun to learn. We like them.
    # ================================================================
    "3c08ee13-b9d4-4a5e-c172-0e3f6a8d1c26": {
        "question_en": "What is this passage about?",
        "choices": ["Animals around us", "Food we eat", "Our school day"],
        "correct_answer": "Animals around us",
    },
    "d83531ec-c1e5-4b6a-a283-1f4a7b9e2d37": {
        "question_en": "What are popular pets?",
        "choices": ["Cats and dogs", "Fish and birds", "Cows and chickens"],
        "correct_answer": "Cats and dogs",
    },
    "d40bbd1c-d2f6-4c7b-b394-2a5b8c0f3e48": {
        "question_en": "Where do birds fly?",
        "choices": ["In the sky", "In the water", "On the ground"],
        "correct_answer": "In the sky",
    },
    "efc72f8b-e3a7-4d8c-c415-3b6c9d1a4f59": {
        "question_en": "What does 'popular' mean?",
        "choices": ["Liked by many people", "Very big", "Very fast"],
        "correct_answer": "Liked by many people",
    },
    "1a4f54c0-f4b8-4e9d-d526-4c7d0e2b5a61": {
        "question_en": "Why do people give pets food and water?",
        "choices": ["To take care of them", "To make them run", "To sell them"],
        "correct_answer": "To take care of them",
    },

    # ================================================================
    # U04_B: "Life on a Farm"
    # Passage: Farm has animals. Chickens give eggs. Cows give milk.
    #   Man takes care, wakes early. Gives food/water, cleans homes.
    #   Busy place. Children like farms. Learn about nature.
    # ================================================================
    "02f1d9ba-a5c9-4f1e-e637-5d8e1f3c6b72": {
        "question_en": "What is this passage about?",
        "choices": ["Life on a farm", "A day at school", "Going shopping"],
        "correct_answer": "Life on a farm",
    },
    "efff02e4-b6d1-4a2f-f748-6e9f2a4d7c83": {
        "question_en": "What do chickens give us?",
        "choices": ["Eggs", "Milk", "Water"],
        "correct_answer": "Eggs",
    },
    "e76739ee-c7e2-4b3a-a859-7f1a3b5e8d94": {
        "question_en": "What does the man on the farm do?",
        "choices": ["Takes care of the animals", "Goes to the shop", "Reads books all day"],
        "correct_answer": "Takes care of the animals",
    },
    "5fd5c185-d8f3-4c4b-b961-8a2b4c6f9e15": {
        "question_en": "What does 'nature' mean?",
        "choices": ["Trees, animals, and the world outside", "A type of food", "A big building"],
        "correct_answer": "Trees, animals, and the world outside",
    },
    "51335029-e9a4-4d5c-c172-9b3c5d7a0f26": {
        "question_en": "Why do children like farms?",
        "choices": ["They see animals and play outside", "They eat a lot of food", "They sleep all day"],
        "correct_answer": "They see animals and play outside",
    },

    # ================================================================
    # U05_A: "Weather and Seasons"
    # Passage: Weather changes. Hot/sunny or cold/cloudy. Each season different.
    #   Four seasons. Summer hot, drink water, stay inside. Winter cool, rains.
    #   Spring nice, flowers beautiful. Each season has own feel.
    # ================================================================
    "d5b280cf-f1b5-4e6d-d283-0c4d6e8a1b37": {
        "question_en": "What is the main topic?",
        "choices": ["Weather and seasons", "Food and cooking", "Friends at school"],
        "correct_answer": "Weather and seasons",
    },
    "eefe672f-a2c6-4f7e-e394-1d5e7f9b2c48": {
        "question_en": "What do people do in summer?",
        "choices": ["Drink water and stay inside", "Play in the snow", "Go to school"],
        "correct_answer": "Drink water and stay inside",
    },
    "8599c15c-b3d7-4a8f-f415-2e6f8a1c3d59": {
        "question_en": "What does 'season' mean?",
        "choices": ["A time of year like summer or winter", "A type of food", "A day of the week"],
        "correct_answer": "A time of year like summer or winter",
    },
    "4bcbc904-c4e8-4b9a-a526-3f7a9b2d4e61": {
        "question_en": "What happens in winter?",
        "choices": ["It is cool and it rains", "It is very hot", "The flowers grow"],
        "correct_answer": "It is cool and it rains",
    },
    "542867a2-d5f9-4c1b-b637-4a8b0c3e5f72": {
        "question_en": "Why do many people like spring?",
        "choices": ["The weather is nice and flowers are beautiful", "It is very cold", "They stay inside all day"],
        "correct_answer": "The weather is nice and flowers are beautiful",
    },

    # ================================================================
    # U05_B: "A Rainy Day"
    # Passage: Rainy weather. Sky gray, cloudy. Umbrellas. Streets wet, air cool.
    #   Stay home: read, TV, hot tea. Warm inside. Children play in water.
    #   Air smells fresh. Green and clean.
    # ================================================================
    "5d3d872c-e6a1-4d2c-c748-5b9c1d4f6a83": {
        "question_en": "What is this passage about?",
        "choices": ["A rainy day", "A sunny day", "A school day"],
        "correct_answer": "A rainy day",
    },
    "1e2d7d22-f7b2-4e3d-d859-6c1d2e5a7b94": {
        "question_en": "What do people carry when it rains?",
        "choices": ["Umbrellas", "Books", "Food"],
        "correct_answer": "Umbrellas",
    },
    "448cbd0a-a8c3-4f4e-e961-7d2e3f6b8c15": {
        "question_en": "What do people do on rainy days at home?",
        "choices": ["Read books or watch TV", "Play outside", "Go to the shop"],
        "correct_answer": "Read books or watch TV",
    },
    "70cce108-b9d4-4a5f-f172-8e3f4a7c9d26": {
        "question_en": "What does 'fresh' mean in the passage?",
        "choices": ["Clean and new", "Very old", "Very hot"],
        "correct_answer": "Clean and new",
    },
    "dd6da6d4-c1e5-4b6a-a283-9f4a5b8d0e37": {
        "question_en": "Why do children like the rain?",
        "choices": ["They play in the water and have fun", "They go to school", "They sleep all day"],
        "correct_answer": "They play in the water and have fun",
    },

    # ================================================================
    # U06_A: "My Family"
    # Passage: Big family. Father works office. Mother stays home.
    #   Two brothers, one sister. Eat at night as family. Mother cooks.
    #   Talk, laugh, share stories. Weekend see grandparents. Play games.
    # ================================================================
    "c721e3b0-93d5-405b-8ef0-30eec65b2a43": {
        "question_en": "What is this passage about?",
        "choices": ["A person and their family", "A day at the park", "Food in the city"],
        "correct_answer": "A person and their family",
    },
    "ffcc13b1-15dd-44bd-9aaf-62304b70ff34": {
        "question_en": "Where does the father work?",
        "choices": ["In an office", "On a farm", "At a shop"],
        "correct_answer": "In an office",
    },
    "0fdf9893-972f-4516-9dea-228e43fabdb0": {
        "question_en": "What does 'family' mean?",
        "choices": ["Your mother, father, brothers, and sisters", "Your friends at school", "People in the city"],
        "correct_answer": "Your mother, father, brothers, and sisters",
    },
    "98be2312-1643-44c3-9e60-f6bae6c8bb4d": {
        "question_en": "What do they do on the weekend?",
        "choices": ["See their grandparents", "Go to work", "Stay in bed"],
        "correct_answer": "See their grandparents",
    },
    "a2b8fdd3-6bd1-4c8b-b8bb-72d4ce26adb9": {
        "question_en": "Why is eating together a nice time?",
        "choices": ["They talk, laugh, and share stories", "The food is free", "They eat very fast"],
        "correct_answer": "They talk, laugh, and share stories",
    },

    # ================================================================
    # U06_B: "Friends at School"
    # Passage: Many friends at school. Study/play together. Best friend kind, funny.
    #   Learn things. Read books, write notebooks. Teacher helps.
    #   Visit friends after school. Eat, play games. Good friends.
    # ================================================================
    "b4df6826-d2f6-4a7b-b394-1a5e8c0f3e48": {
        "question_en": "What is this passage about?",
        "choices": ["Friends at school", "Animals on a farm", "Weather and seasons"],
        "correct_answer": "Friends at school",
    },
    "2f5fae38-e3a7-4b8c-c415-2b6f9d1a4f59": {
        "question_en": "What is the best friend like?",
        "choices": ["Kind and funny", "Sad and quiet", "Big and strong"],
        "correct_answer": "Kind and funny",
    },
    "fc4cb93c-f4b8-4c9d-d526-3c7d0e2b5a61": {
        "question_en": "What does 'study' mean?",
        "choices": ["Learn and read about things", "Play a game", "Cook some food"],
        "correct_answer": "Learn and read about things",
    },
    "de11b2a4-a5c9-4d1e-e637-4d8e1f3c6b72": {
        "question_en": "What do they do after school?",
        "choices": ["Visit friends and play games", "Go to work", "Sleep all day"],
        "correct_answer": "Visit friends and play games",
    },
    "bd45f687-b6d1-4e2f-f748-5e9f2a4d7c83": {
        "question_en": "Why does the person like school?",
        "choices": ["They have good friends and a good teacher", "The school is very big", "They eat lunch there"],
        "correct_answer": "They have good friends and a good teacher",
    },

    # ================================================================
    # U07_A: "Going Shopping"
    # Passage: Like shopping. Many shops. Clothes, food, drinks. Big market.
    #   Look at prices. Cheap and expensive. Save money. Buy what need.
    #   Shopping with family fun. Buy gifts.
    # ================================================================
    "5a9b1973-c7e2-4f3a-a859-6f1a3b5e8d94": {
        "question_en": "What is this passage about?",
        "choices": ["Going shopping", "Going to school", "Going to the doctor"],
        "correct_answer": "Going shopping",
    },
    "64690a76-d8f3-4a4b-b961-7a2b4c6f9e15": {
        "question_en": "What do some shops sell?",
        "choices": ["Clothes, food, and drinks", "Only books", "Only animals"],
        "correct_answer": "Clothes, food, and drinks",
    },
    "7db8edcb-e9a4-4b5c-c172-8b3c5d7a0f26": {
        "question_en": "What does 'expensive' mean?",
        "choices": ["Costs a lot of money", "Very small", "Very old"],
        "correct_answer": "Costs a lot of money",
    },
    "dc921afb-f1b5-4c6d-d283-9c4d6e8a1b37": {
        "question_en": "What does the person always try to do?",
        "choices": ["Save money", "Buy everything", "Go home early"],
        "correct_answer": "Save money",
    },
    "ba87ed90-a2c6-4d7e-e394-0d5e7f9b2c48": {
        "question_en": "Why is shopping with family fun?",
        "choices": ["They spend the day together", "The shop is very big", "They get free food"],
        "correct_answer": "They spend the day together",
    },

    # ================================================================
    # U07_B: "Money and Saving"
    # Passage: Money important. Buy food, clothes. Work to get money.
    #   Save money in bank. Buy big things later. Think before buy.
    #   Do I need this? Saving helps future.
    # ================================================================
    "5c28c15f-b3d7-4e8f-f415-1e6f8a1c3d59": {
        "question_en": "What is the main idea?",
        "choices": ["Money and saving are important", "Food is very cheap", "Work is very easy"],
        "correct_answer": "Money and saving are important",
    },
    "aff5d7c9-c4e8-4f9a-a526-2f7a9b2d4e61": {
        "question_en": "Where can you put your money?",
        "choices": ["In a bank", "Under a tree", "At school"],
        "correct_answer": "In a bank",
    },
    "18d45a5e-d5f9-4a1b-b637-3a8b0c3e5f72": {
        "question_en": "What does 'save' mean?",
        "choices": ["Keep money and not spend it", "Give money away", "Find money on the ground"],
        "correct_answer": "Keep money and not spend it",
    },
    "dcd5beac-e6a1-4b2c-c748-4b9c1d4f6a83": {
        "question_en": "What should you ask before you buy?",
        "choices": ["Do I really need this?", "Is this very big?", "Is this very old?"],
        "correct_answer": "Do I really need this?",
    },
    "3546589d-f7b2-4c3d-d859-5c1d2e5a7b94": {
        "question_en": "Why is saving money good?",
        "choices": ["It helps you in the future", "It makes food taste better", "It helps you sleep well"],
        "correct_answer": "It helps you in the future",
    },

    # ================================================================
    # U08_A: "Staying Healthy"
    # Passage: Good health. Eat healthy food. Vegetables, fruit. Move body:
    #   walk, run, play sports. Stay strong/happy. Sleep eight hours.
    #   Drink water. Eat well, sleep well.
    # ================================================================
    "a19ba35e-a8c3-4d4e-e961-6d2e3f6b8c15": {
        "question_en": "What is this passage about?",
        "choices": ["Staying healthy", "Going to the park", "Cooking at home"],
        "correct_answer": "Staying healthy",
    },
    "5b496bda-b9d4-4e5f-f172-7e3f4a7c9d26": {
        "question_en": "What food is good for you?",
        "choices": ["Vegetables and fruit", "Only bread", "Only rice"],
        "correct_answer": "Vegetables and fruit",
    },
    "3b43e7af-c1e5-4f6a-a283-8f4a5b8d0e37": {
        "question_en": "How many hours should you sleep?",
        "choices": ["Eight hours", "Two hours", "Twelve hours"],
        "correct_answer": "Eight hours",
    },
    "a96885d0-d2f6-4a7b-b394-9a5e8c0f3e48": {
        "question_en": "What does 'healthy' mean?",
        "choices": ["Good for your body", "Very big", "Very old"],
        "correct_answer": "Good for your body",
    },
    "3711b114-e3a7-4b8c-c415-0b6f9d1a4f59": {
        "question_en": "Why should you move your body?",
        "choices": ["To stay strong and happy", "To feel tired", "To eat more food"],
        "correct_answer": "To stay strong and happy",
    },

    # ================================================================
    # U08_B: "At the Doctor"
    # Passage: Feel sick some days. Go to doctor. Asks how you feel.
    #   Checks body. Looks at eyes/ears. May give medicine.
    #   Medicine helps feel well. See doctor each year.
    # ================================================================
    "71933670-f4b8-4c9d-d526-1c7d0e2b5a61": {
        "question_en": "What is this passage about?",
        "choices": ["Going to the doctor", "Going to school", "Going shopping"],
        "correct_answer": "Going to the doctor",
    },
    "aecfe54e-a5c9-4d1e-e637-2d8e1f3c6b72": {
        "question_en": "What does the doctor look at?",
        "choices": ["Your eyes and ears", "Your shoes", "Your bag"],
        "correct_answer": "Your eyes and ears",
    },
    "ba095fcd-b6d1-4e2f-f748-3e9f2a4d7c83": {
        "question_en": "What may the doctor give you?",
        "choices": ["Medicine", "A book", "Food"],
        "correct_answer": "Medicine",
    },
    "bde5bc2d-c7e2-4f3a-a859-4f1a3b5e8d94": {
        "question_en": "What does 'medicine' mean?",
        "choices": ["Something that helps you feel well", "A type of food", "A place to sleep"],
        "correct_answer": "Something that helps you feel well",
    },
    "b4ef6bc6-d8f3-4a4b-b961-5a2b4c6f9e15": {
        "question_en": "Why should you see the doctor each year?",
        "choices": ["To stay well and healthy", "To get new clothes", "To eat good food"],
        "correct_answer": "To stay well and healthy",
    },

    # ================================================================
    # U09_A: "Fun Hobbies"
    # Passage: Everyone has hobbies. Free time: read, sports. Draw/paint.
    #   Pictures with colors. Friend plays music/piano. Hobbies make happy.
    #   Rest after long day. Find hobby you love.
    # ================================================================
    "225de15d-e9a4-4b5c-c172-6b3c5d7a0f26": {
        "question_en": "What is this passage about?",
        "choices": ["Fun hobbies", "Going to work", "Cooking food"],
        "correct_answer": "Fun hobbies",
    },
    "87d56e67-f1b5-4c6d-d283-7c4d6e8a1b37": {
        "question_en": "What does the person like to do?",
        "choices": ["Draw and paint", "Cook food", "Drive a car"],
        "correct_answer": "Draw and paint",
    },
    "cb346e25-a2c6-4d7e-e394-8d5e7f9b2c48": {
        "question_en": "What does 'hobbies' mean?",
        "choices": ["Things you like to do in free time", "Things you eat for lunch", "Places you go to work"],
        "correct_answer": "Things you like to do in free time",
    },
    "60e79488-b3d7-4e8f-f415-9e6f8a1c3d59": {
        "question_en": "What does the friend play?",
        "choices": ["The piano", "A ball", "A game"],
        "correct_answer": "The piano",
    },
    "9c531887-c4e8-4f9a-a526-0f7a9b2d4e61": {
        "question_en": "Why are hobbies good for you?",
        "choices": ["They make you happy and help you rest", "They make you money", "They help you work harder"],
        "correct_answer": "They make you happy and help you rest",
    },

    # ================================================================
    # U09_B: "A Day at the Park"
    # Passage: Park nice place. Trees, flowers. Walk and play. Fresh air.
    #   Children run, play with balls. Sit, read. Picnic with family.
    #   Go every weekend. Meet friends. Favorite place.
    # ================================================================
    "6def4aef-d5f9-4a1b-b637-1a8b0c3e5f72": {
        "question_en": "What is this passage about?",
        "choices": ["A day at the park", "A day at school", "A day at the shop"],
        "correct_answer": "A day at the park",
    },
    "60b1ed3b-e6a1-4b2c-c748-2b9c1d4f6a83": {
        "question_en": "What is in the park?",
        "choices": ["Trees and flowers", "Cars and buses", "Shops and markets"],
        "correct_answer": "Trees and flowers",
    },
    "1afb912a-f7b2-4c3d-d859-3c1d2e5a7b94": {
        "question_en": "What does 'fresh' mean here?",
        "choices": ["Clean and nice to breathe", "Very hot", "Very cold"],
        "correct_answer": "Clean and nice to breathe",
    },
    "666c7bdd-a8c3-4d4e-e961-4d2e3f6b8c15": {
        "question_en": "When does the person go to the park?",
        "choices": ["Every weekend", "Every morning", "Every night"],
        "correct_answer": "Every weekend",
    },
    "e4f72204-b9d4-4e5f-f172-5e3f4a7c9d26": {
        "question_en": "Why is the park a happy place?",
        "choices": ["People walk, play, and have fun together", "It has many cars", "It is very loud"],
        "correct_answer": "People walk, play, and have fun together",
    },

    # ================================================================
    # U10_A: "Going on a Trip"
    # Passage: Traveling fun. Visit new places. Plane, car, train.
    #   Prepare: pack clothes. Passport and ticket. Arrive: everything different.
    #   Food, people, weather new. Learn about world.
    # ================================================================
    "3ec90734-c1e5-4f6a-a283-6f4a5b8d0e37": {
        "question_en": "What is this passage about?",
        "choices": ["Going on a trip", "Cooking at home", "Going to school"],
        "correct_answer": "Going on a trip",
    },
    "ddb85b64-d2f6-4a7b-b394-7a5e8c0f3e48": {
        "question_en": "What do you pack in your bag?",
        "choices": ["Clothes and other things", "Only food", "Only books"],
        "correct_answer": "Clothes and other things",
    },
    "06e508ec-e3a7-4b8c-c415-8b6f9d1a4f59": {
        "question_en": "What do you need to travel?",
        "choices": ["A passport and a ticket", "Only money", "Only a phone"],
        "correct_answer": "A passport and a ticket",
    },
    "fdc628c8-f4b8-4c9d-d526-9c7d0e2b5a61": {
        "question_en": "What does 'arrive' mean?",
        "choices": ["Get to a new place", "Leave your home", "Stay in bed"],
        "correct_answer": "Get to a new place",
    },
    "16a1071f-a5c9-4d1e-e637-0d8e1f3c6b72": {
        "question_en": "Why is traveling fun?",
        "choices": ["You learn about the world", "You stay at home", "You sleep a lot"],
        "correct_answer": "You learn about the world",
    },

    # ================================================================
    # U10_B: "At the Airport"
    # Passage: Airport big/busy. Travel to cities/countries. Shops, restaurants.
    #   Check desk: show passport/ticket. Wait at gate. Sit, read, eat.
    #   Plane ready, get on. Find seat. Up into sky.
    # ================================================================
    "d7590f4f-b6d1-4e2f-f748-1e9f2a4d7c83": {
        "question_en": "What is this passage about?",
        "choices": ["Being at the airport", "Being at school", "Being at the park"],
        "correct_answer": "Being at the airport",
    },
    "fd24ae35-c7e2-4f3a-a859-2f1a3b5e8d94": {
        "question_en": "What do you show at the check desk?",
        "choices": ["Your passport and ticket", "Your phone", "Your bag"],
        "correct_answer": "Your passport and ticket",
    },
    "e644778c-d8f3-4a4b-b961-3a2b4c6f9e15": {
        "question_en": "What does 'airport' mean?",
        "choices": ["A place where planes come and go", "A place to buy food", "A place to play sports"],
        "correct_answer": "A place where planes come and go",
    },
    "fa4b43fa-e9a4-4b5c-c172-4b3c5d7a0f26": {
        "question_en": "What do you do at the gate?",
        "choices": ["Wait for your plane", "Buy a ticket", "Eat a big meal"],
        "correct_answer": "Wait for your plane",
    },
    "49839171-f1b5-4c6d-d283-5c4d6e8a1b37": {
        "question_en": "Why is the airport busy?",
        "choices": ["Many people travel to other places", "There is a big party", "The shops are free"],
        "correct_answer": "Many people travel to other places",
    },

    # ================================================================
    # U11_A: "Technology in Our Lives"
    # Passage: Use phones each day. Talk to people. Find what need. Life easier.
    #   Internet useful. Read news, watch shows, learn. Use apps.
    #   Take break. Family. Go outside. Don't use too much.
    # ================================================================
    "01fe670c-a2c6-4d7e-e394-6d5e7f9b2c48": {
        "question_en": "What is this passage about?",
        "choices": ["How we use phones and the internet", "How we cook food", "How we play sports"],
        "correct_answer": "How we use phones and the internet",
    },
    "96d9b604-b3d7-4e8f-f415-7e6f8a1c3d59": {
        "question_en": "What can you do on the internet?",
        "choices": ["Read news and watch shows", "Sleep all day", "Cook food"],
        "correct_answer": "Read news and watch shows",
    },
    "3aaa8bc5-c4e8-4f9a-a526-8f7a9b2d4e61": {
        "question_en": "What does 'apps' mean?",
        "choices": ["Programs on your phone that help you", "Types of food", "Names of cities"],
        "correct_answer": "Programs on your phone that help you",
    },
    "85083670-d5f9-4a1b-b637-9a8b0c3e5f72": {
        "question_en": "What should you also do?",
        "choices": ["Spend time with family and go outside", "Use your phone all day", "Stay in bed"],
        "correct_answer": "Spend time with family and go outside",
    },
    "0bf451e5-e6a1-4b2c-c748-0b9c1d4f6a83": {
        "question_en": "Why should you not use your phone too much?",
        "choices": ["It is good to take a break and be with people", "Phones are very old", "Phones cost too much money"],
        "correct_answer": "It is good to take a break and be with people",
    },

    # ================================================================
    # U11_B: "Phones and Communication"
    # Passage: Most have phone. Call, write, photos, shows. Share photos with friends.
    #   Talk to people in other places. Easy to reach anyone. Stay close.
    #   Be careful. Don't use too much. Talk face to face.
    # ================================================================
    "81e371e1-f7b2-4c3d-d859-1c1d2e5a7b94": {
        "question_en": "What is this passage about?",
        "choices": ["Phones and how we talk to people", "Animals around us", "Weather and seasons"],
        "correct_answer": "Phones and how we talk to people",
    },
    "6ca0430f-a8c3-4d4e-e961-2d2e3f6b8c15": {
        "question_en": "What do people share with friends?",
        "choices": ["Photos", "Money", "Animals"],
        "correct_answer": "Photos",
    },
    "bd7a974d-b9d4-4e5f-f172-3e3f4a7c9d26": {
        "question_en": "What can you do with a phone?",
        "choices": ["Call, write, and take photos", "Only make calls", "Only play games"],
        "correct_answer": "Call, write, and take photos",
    },
    "32f8dd15-c1e5-4f6a-a283-4f4a5b8d0e37": {
        "question_en": "What does 'careful' mean?",
        "choices": ["Think about what you do", "Very fast", "Very big"],
        "correct_answer": "Think about what you do",
    },
    "2f97e631-d2f6-4a7b-b394-5a5e8c0f3e48": {
        "question_en": "Why should you talk face to face?",
        "choices": ["It is good to be with people, not just on a phone", "Phones do not work", "Talking is free"],
        "correct_answer": "It is good to be with people, not just on a phone",
    },

    # ================================================================
    # U12_A: "Different Jobs"
    # Passage: Many jobs. Teachers help children learn. Doctors help sick.
    #   Work in offices: computers, reports. Outside: farmers grow food.
    #   Jobs for everyone. Work to help and make money. What job do you want?
    # ================================================================
    "5cb62b38-3648-4443-9f46-06af90e28165": {
        "question_en": "What is this passage about?",
        "choices": ["Different jobs people do", "Food in the city", "A day at the park"],
        "correct_answer": "Different jobs people do",
    },
    "2f9ebba9-4605-421a-a9d7-1607bf2c81f0": {
        "question_en": "What do teachers do?",
        "choices": ["Help children learn", "Grow food", "Fix cars"],
        "correct_answer": "Help children learn",
    },
    "1b97eb37-c397-44ad-bc61-9a337c5ef96c": {
        "question_en": "What do farmers do?",
        "choices": ["Grow food and care for animals", "Work in an office", "Drive a bus"],
        "correct_answer": "Grow food and care for animals",
    },
    "5d6ac37c-6393-43b0-a855-9d36f9e0e7a5": {
        "question_en": "What does 'job' mean?",
        "choices": ["Work that you do every day", "A type of food", "A place to sleep"],
        "correct_answer": "Work that you do every day",
    },
    "e1d6bcb8-f42a-49bf-8529-d95369ab4765": {
        "question_en": "Why do people work?",
        "choices": ["To help others and make money", "To stay at home", "To play games all day"],
        "correct_answer": "To help others and make money",
    },

    # ================================================================
    # U12_B: "My Dream Job"
    # Passage: Think about future job. Help people. Doctor or teacher.
    #   Father says study hard. Good education helps. Study every day.
    #   Future: many new jobs. Some use technology. Ready for future.
    # ================================================================
    "7f90abff-e3a7-4b8c-c415-6b6f9d1a4f59": {
        "question_en": "What is this passage about?",
        "choices": ["Thinking about a future job", "Going on a trip", "Cooking at home"],
        "correct_answer": "Thinking about a future job",
    },
    "380c0815-f4b8-4c9d-d526-7c7d0e2b5a61": {
        "question_en": "What job does the person want?",
        "choices": ["Doctor or teacher", "Farmer", "Driver"],
        "correct_answer": "Doctor or teacher",
    },
    "15846ec2-a5c9-4d1e-e637-8d8e1f3c6b72": {
        "question_en": "What does 'education' mean?",
        "choices": ["Learning at school", "Cooking at home", "Playing at the park"],
        "correct_answer": "Learning at school",
    },
    "f94ec87d-b6d1-4e2f-f748-9e9f2a4d7c83": {
        "question_en": "What does the father say?",
        "choices": ["Study hard", "Play more", "Sleep more"],
        "correct_answer": "Study hard",
    },
    "509c0882-c7e2-4f3a-a859-0f1a3b5e8d94": {
        "question_en": "Why does the person study every day?",
        "choices": ["To be ready for a good job", "To go to the park", "To cook better food"],
        "correct_answer": "To be ready for a good job",
    },
}

print(f"Total questions defined: {len(NEW_QUESTIONS)}")
assert len(NEW_QUESTIONS) == 120, f"Expected 120, got {len(NEW_QUESTIONS)}"

# Save for reference
with open(os.path.join(CLEANUP, "13-FIX-new-questions.json"), "w", encoding="utf-8") as f:
    json.dump(NEW_QUESTIONS, f, ensure_ascii=False, indent=2)
print("Saved to 13-FIX-new-questions.json")

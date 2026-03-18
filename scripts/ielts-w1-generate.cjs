require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tasks = [
  {
    task_type: 'task1',
    sub_type: 'line_graph',
    title: 'Global Internet Usage Trends (2000–2020)',
    prompt: 'The line graph below shows the percentage of the population using the internet in four regions between 2000 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'line_graph',
      x_axis: 'Year',
      y_axis: 'Internet users (% of population)',
      categories: ['North America', 'Europe', 'Middle East', 'Sub-Saharan Africa'],
      data: {
        '2000': [43, 15, 2, 0.5],
        '2005': [68, 38, 8, 2],
        '2010': [77, 58, 21, 7],
        '2015': [84, 73, 38, 16],
        '2020': [90, 85, 62, 28]
      }
    },
    template_structure: {
      introduction: 'Paraphrase the task — what the graph shows, time period, regions',
      overview: 'Two key trends: all regions increased; North America consistently highest; Sub-Saharan Africa lowest but growing',
      body1: 'North America and Europe — already high, steady growth, convergence by 2020',
      body2: 'Middle East and Sub-Saharan Africa — low start, rapid growth especially 2010–2020'
    },
    key_phrases: [
      'showed a steady increase from... to...',
      'rose dramatically/sharply/gradually',
      'the most significant growth was seen in...',
      'by contrast / in comparison',
      'over the period shown',
      'starting at approximately... and reaching...',
      'remained the highest/lowest throughout',
      'the gap between... and... narrowed'
    ],
    model_answer_band7: 'The line graph illustrates the proportion of the population with internet access in four world regions over a 20-year period from 2000 to 2020.\n\nOverall, internet usage rose considerably in all four regions, with North America maintaining the highest rate throughout and Sub-Saharan Africa recording the lowest, despite showing the fastest proportional growth.\n\nIn 2000, North America already had the highest internet penetration at 43%, which climbed steadily to 90% by 2020. Europe followed a similar upward trajectory, starting at just 15% in 2000 but rising sharply to reach 85% in 2020, nearly closing the gap with North America.\n\nThe Middle East and Sub-Saharan Africa both began the period with minimal internet usage, at 2% and 0.5% respectively. However, both regions experienced rapid growth, particularly after 2010. The Middle East reached 62% by 2020, while Sub-Saharan Africa, despite its significant improvement, remained at 28%, the lowest among the four regions.',
    difficulty_band: '5.5-6.5',
    sort_order: 1
  },
  {
    task_type: 'task1',
    sub_type: 'line_graph',
    title: 'Renewable Energy Production in Four Countries',
    prompt: 'The graph below shows the amount of electricity generated from renewable sources in four countries between 2005 and 2025.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'line_graph',
      x_axis: 'Year',
      y_axis: 'Electricity from renewables (TWh)',
      categories: ['Germany', 'Saudi Arabia', 'Brazil', 'China'],
      data: {
        '2005': [42, 0.1, 68, 35],
        '2010': [71, 0.3, 82, 90],
        '2015': [119, 1.2, 93, 210],
        '2020': [175, 3.5, 106, 420],
        '2025': [210, 12, 118, 680]
      }
    },
    template_structure: {
      introduction: 'Paraphrase — electricity from renewable sources, four countries, 2005–2025',
      overview: 'China showed the most dramatic increase; Brazil was steady; Saudi Arabia grew from a very low base; Germany showed consistent growth',
      body1: 'China and Germany — both major increases but China overtook all by 2010',
      body2: 'Brazil — relatively stable growth; Saudi Arabia — minimal but accelerating recently'
    },
    key_phrases: [
      'experienced exponential growth',
      'increased more than tenfold',
      'overtook [country] in [year]',
      'maintained a relatively steady rate',
      'saw a marginal increase',
      'grew from a negligible amount to...',
      'the most striking feature is...',
      'accounted for the largest share by 2025'
    ],
    model_answer_band7: 'The line graph depicts the volume of electricity produced from renewable sources in Germany, Saudi Arabia, Brazil, and China over a twenty-year period from 2005 to 2025.\n\nOverall, all four nations increased their renewable energy output, though the scale of growth varied enormously. China experienced by far the most dramatic expansion, while Saudi Arabia started from a near-zero base.\n\nIn 2005, Brazil led with 68 TWh, followed by Germany at 42 TWh and China at 35 TWh. However, China\'s production surged rapidly, overtaking Brazil in 2008 and Germany shortly after, reaching a remarkable 680 TWh by 2025. Germany also showed strong growth, rising steadily from 42 to 210 TWh over the period.\n\nBrazil\'s output grew more gradually, increasing from 68 to 118 TWh. Saudi Arabia\'s renewable energy generation remained minimal for most of the period, starting at just 0.1 TWh in 2005, but showed signs of acceleration after 2020, reaching 12 TWh by 2025.',
    difficulty_band: '6.0-7.0',
    sort_order: 2
  },
  {
    task_type: 'task1',
    sub_type: 'bar_chart',
    title: 'Water Consumption by Sector in Three Regions',
    prompt: 'The bar chart below compares water consumption by sector (agricultural, industrial, and domestic) in three regions in 2022.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'bar_chart',
      x_axis: 'Region',
      y_axis: 'Water consumption (billion cubic metres)',
      categories: ['Agricultural', 'Industrial', 'Domestic'],
      data: {
        'Middle East': [145, 18, 32],
        'Southeast Asia': [210, 45, 38],
        'Western Europe': [52, 88, 47]
      }
    },
    template_structure: {
      introduction: 'Paraphrase — water use by three sectors in three regions, 2022',
      overview: 'Agriculture dominated in Middle East and SE Asia; industry was largest in Western Europe; domestic use relatively similar across regions',
      body1: 'Agricultural and industrial water use — big contrasts between regions',
      body2: 'Domestic consumption — relatively consistent; total consumption comparison'
    },
    key_phrases: [
      'the largest proportion of water was used for...',
      'accounted for approximately...',
      'in stark contrast',
      'the most notable difference was...',
      'consumed nearly three times as much... as...',
      'domestic usage remained fairly consistent across all three regions',
      'the figures for... and... were considerably lower',
      'dwarfed the amount used for...'
    ],
    model_answer_band7: 'The bar chart compares the volume of water consumed by the agricultural, industrial, and domestic sectors in the Middle East, Southeast Asia, and Western Europe in 2022.\n\nOverall, agriculture was the dominant consumer of water in the Middle East and Southeast Asia, whereas industry used the most water in Western Europe. Domestic consumption was comparatively similar across all three regions.\n\nSoutheast Asia recorded the highest agricultural water usage at 210 billion cubic metres, followed by the Middle East at 145 billion. In sharp contrast, Western Europe used only 52 billion cubic metres for farming. The pattern reversed for industrial consumption, with Western Europe leading at 88 billion cubic metres, compared with 45 billion in Southeast Asia and a mere 18 billion in the Middle East.\n\nDomestic water use showed the least variation between regions, ranging from 32 billion cubic metres in the Middle East to 47 billion in Western Europe. Southeast Asia fell between these figures at 38 billion cubic metres.',
    difficulty_band: '5.5-6.5',
    sort_order: 3
  },
  {
    task_type: 'task1',
    sub_type: 'bar_chart',
    title: 'University Enrollment by Subject Area',
    prompt: 'The bar chart below shows the number of students enrolled in five subject areas at a major university in 2015 and 2023.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'bar_chart',
      x_axis: 'Subject Area',
      y_axis: 'Number of students enrolled',
      categories: ['2015', '2023'],
      data: {
        'Engineering': [3200, 4800],
        'Business': [4500, 5100],
        'Medicine': [2800, 3400],
        'Computer Science': [1900, 5600],
        'Arts & Humanities': [3600, 2200]
      }
    },
    template_structure: {
      introduction: 'Paraphrase — student enrollment in five subjects, two years compared',
      overview: 'Computer Science saw the most dramatic increase; Arts & Humanities declined; most other subjects grew moderately',
      body1: 'Subjects that increased — especially Computer Science (nearly tripled) and Engineering',
      body2: 'Business and Medicine — moderate growth; Arts & Humanities — significant decline'
    },
    key_phrases: [
      'the number of students enrolled in... nearly tripled',
      'saw a moderate increase of...',
      'was the only subject to experience a decline',
      'enrollment figures rose from... to...',
      'by 2023, ... had overtaken ... as the most popular subject',
      'remained relatively stable',
      'dropped significantly from... to...',
      'the most striking change was in...'
    ],
    model_answer_band7: 'The bar chart illustrates changes in student enrollment across five academic disciplines at a major university between 2015 and 2023.\n\nOverall, four out of five subjects saw increases in student numbers, with Computer Science recording the most remarkable growth. Arts and Humanities was the only field to experience a decline.\n\nThe most dramatic shift occurred in Computer Science, where enrollment nearly tripled from 1,900 students in 2015 to 5,600 in 2023, making it the most popular subject by the end of the period. Engineering also grew substantially, rising from 3,200 to 4,800 students.\n\nBusiness remained the second most popular subject overall, with a more modest increase from 4,500 to 5,100 students. Medicine saw a similar pattern of moderate growth, climbing from 2,800 to 3,400 enrollments.\n\nIn contrast, Arts and Humanities experienced a notable decline, with student numbers falling from 3,600 to just 2,200, a decrease of nearly 40 percent over the eight-year period.',
    difficulty_band: '5.5-6.5',
    sort_order: 4
  },
  {
    task_type: 'task1',
    sub_type: 'pie_chart',
    title: 'Household Expenditure Breakdown',
    prompt: 'The two pie charts below show the average household expenditure in a Gulf country in 2010 and 2023.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'pie_chart',
      labels: ['Housing', 'Food', 'Transport', 'Education', 'Healthcare', 'Entertainment', 'Other'],
      data: {
        '2010': [32, 24, 15, 10, 6, 5, 8],
        '2023': [28, 18, 12, 16, 8, 11, 7]
      }
    },
    template_structure: {
      introduction: 'Paraphrase — household spending in a Gulf country, two years',
      overview: 'Housing and food decreased; education and entertainment increased; housing remained the largest category in both years',
      body1: 'Categories that decreased — housing, food, transport',
      body2: 'Categories that increased — education, entertainment, healthcare'
    },
    key_phrases: [
      'the largest share of expenditure went to...',
      'accounted for roughly a third of...',
      'the proportion of spending on... fell from... to...',
      'there was a noticeable shift towards...',
      'spending on... rose by... percentage points',
      'remained the dominant category',
      'the most significant change was...',
      'while... decreased, ... saw a corresponding increase'
    ],
    model_answer_band7: 'The two pie charts compare how households in a Gulf country allocated their spending in 2010 and 2023.\n\nOverall, housing remained the largest expenditure category in both years, though its share decreased. The most notable trends were the growth in spending on education and entertainment, and the decline in food and transport costs.\n\nIn 2010, housing dominated household budgets at 32%, followed by food at 24% and transport at 15%. Education and healthcare accounted for 10% and 6% respectively, while entertainment made up just 5%.\n\nBy 2023, the spending pattern had shifted noticeably. Housing dropped to 28% and food fell to 18%, possibly reflecting improved food subsidies and supply chains. Transport also decreased to 12%. In contrast, education spending rose significantly from 10% to 16%, reflecting growing investment in learning. Entertainment nearly doubled its share to 11%, suggesting changing lifestyle priorities. Healthcare also edged up from 6% to 8%, while other expenses remained fairly stable at 7%.',
    difficulty_band: '5.5-6.5',
    sort_order: 5
  },
  {
    task_type: 'task1',
    sub_type: 'pie_chart',
    title: 'Sources of Electricity Generation',
    prompt: 'The pie charts below show the sources of electricity generation in Country X in 2000 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'pie_chart',
      labels: ['Oil & Gas', 'Coal', 'Nuclear', 'Hydroelectric', 'Solar', 'Wind', 'Other Renewables'],
      data: {
        '2000': [42, 28, 14, 10, 0.5, 1, 4.5],
        '2020': [25, 15, 12, 11, 16, 14, 7]
      }
    },
    template_structure: {
      introduction: 'Paraphrase — electricity sources in Country X, 2000 vs 2020',
      overview: 'Fossil fuels (oil/gas, coal) declined sharply; solar and wind grew dramatically; nuclear and hydro stayed relatively stable',
      body1: 'Fossil fuel decline — oil/gas from 42% to 25%, coal from 28% to 15%',
      body2: 'Renewable growth — solar from 0.5% to 16%, wind from 1% to 14%'
    },
    key_phrases: [
      'the share of... declined from... to...',
      'fossil fuels collectively accounted for...',
      'solar energy emerged as a significant source',
      'experienced the most dramatic growth',
      'remained relatively unchanged at around...',
      'there was a clear shift away from... towards...',
      'by 2020, renewables (solar, wind, and other) collectively made up...',
      'the energy mix became more diversified'
    ],
    model_answer_band7: 'The two pie charts illustrate the breakdown of electricity sources in Country X in 2000 and 2020.\n\nOverall, there was a significant shift away from fossil fuels towards renewable energy sources, particularly solar and wind power. Despite this transition, oil and gas remained the single largest source in both years.\n\nIn 2000, fossil fuels dominated electricity generation, with oil and gas providing 42% and coal contributing 28%, together accounting for 70% of the total. Nuclear energy supplied 14%, while hydroelectric power made up 10%. Solar and wind were negligible at just 0.5% and 1% respectively.\n\nBy 2020, the energy landscape had transformed considerably. Oil and gas fell to 25% and coal dropped to 15%, reducing the fossil fuel share to 40%. Solar power saw the most remarkable growth, surging from 0.5% to 16%, while wind energy rose from 1% to 14%. Together with other renewables at 7%, clean energy sources accounted for 37% of generation. Nuclear and hydroelectric power remained broadly stable at 12% and 11%.',
    difficulty_band: '6.0-7.0',
    sort_order: 6
  },
  {
    task_type: 'task1',
    sub_type: 'table',
    title: 'Literacy Rates Across Six Countries Over Three Decades',
    prompt: 'The table below shows the adult literacy rates (%) in six countries in 1990, 2005, and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'table',
      columns: ['Country', '1990', '2005', '2020'],
      rows: [
        ['Saudi Arabia', 71, 87, 97],
        ['Egypt', 48, 66, 83],
        ['India', 48, 63, 77],
        ['Brazil', 80, 89, 94],
        ['South Korea', 96, 99, 99],
        ['Nigeria', 42, 53, 62]
      ]
    },
    template_structure: {
      introduction: 'Paraphrase — adult literacy rates in six countries across three decades',
      overview: 'All countries improved; South Korea consistently highest; Nigeria lowest throughout; Saudi Arabia showed the most impressive gain',
      body1: 'Countries with high/near-universal literacy — South Korea, Brazil, Saudi Arabia',
      body2: 'Countries with lower rates — Egypt, India, Nigeria — all improved but significant gaps remain'
    },
    key_phrases: [
      'literacy rates improved across all six countries',
      'rose from... to..., an increase of... percentage points',
      'achieved near-universal literacy',
      'recorded the most significant improvement',
      'despite improvements, ... remained the lowest at...',
      'the gap between... and... narrowed from... to...',
      'consistently maintained the highest rate',
      'had already reached... by 1990'
    ],
    model_answer_band7: 'The table presents adult literacy rates in six countries at three points over a 30-year period: 1990, 2005, and 2020.\n\nOverall, all six nations experienced improvements in literacy, although significant disparities persisted. South Korea maintained the highest rate throughout, while Nigeria remained the lowest despite notable progress.\n\nSouth Korea had near-universal literacy from the start, rising marginally from 96% in 1990 to 99% by 2005 and maintaining that level in 2020. Saudi Arabia demonstrated the most impressive progress, climbing 26 percentage points from 71% to 97%, effectively achieving near-universal adult literacy. Brazil also showed strong results, rising steadily from 80% to 94%.\n\nAmong the lower-performing countries, Egypt and India both started at 48% in 1990 but followed slightly different trajectories. Egypt reached 83% by 2020, while India achieved 77%. Nigeria, which began at the lowest point of 42%, improved to 62% over the three decades, a gain of 20 percentage points, though it still lagged considerably behind the other five countries.',
    difficulty_band: '5.5-6.5',
    sort_order: 7
  },
  {
    task_type: 'task1',
    sub_type: 'table',
    title: 'Tourist Arrivals and Revenue for Five Destinations',
    prompt: 'The table below shows the number of international tourist arrivals (in millions) and tourism revenue (in billion USD) for five destinations in 2019.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'table',
      columns: ['Destination', 'Tourist Arrivals (millions)', 'Tourism Revenue ($ billions)', 'Revenue per Tourist ($)'],
      rows: [
        ['France', 89.4, 63.8, 714],
        ['UAE', 16.7, 38.4, 2299],
        ['Thailand', 39.8, 60.5, 1520],
        ['Turkey', 51.2, 34.5, 674],
        ['Saudi Arabia', 15.3, 27.8, 1817]
      ]
    },
    template_structure: {
      introduction: 'Paraphrase — tourist arrivals and revenue for five destinations, 2019',
      overview: 'France had the most arrivals but not the highest revenue per tourist; UAE had the highest spending per tourist; no direct correlation between volume and revenue',
      body1: 'Arrivals — France led, followed by Turkey and Thailand',
      body2: 'Revenue and spending per tourist — UAE and Saudi Arabia had highest per-tourist spending despite fewer visitors'
    },
    key_phrases: [
      'attracted the highest number of visitors at...',
      'despite receiving fewer tourists, ... generated...',
      'the highest revenue per tourist was recorded in...',
      'visitors to... spent on average...',
      'there was no direct correlation between...',
      'ranked first in terms of... but only... in...',
      'the figures suggest that...',
      'lagged behind in visitor numbers but compensated through...'
    ],
    model_answer_band7: 'The table provides data on international tourist arrivals and tourism revenue for five popular destinations in 2019.\n\nOverall, France attracted the most visitors, but the UAE generated the highest revenue per tourist. The data reveals that higher tourist numbers do not necessarily translate into proportionally higher income.\n\nFrance dominated in terms of visitor volume with 89.4 million arrivals, more than five times the number received by Saudi Arabia (15.3 million). Turkey ranked second with 51.2 million visitors, followed by Thailand at 39.8 million and the UAE at 16.7 million.\n\nHowever, the revenue figures tell a different story. While France earned $63.8 billion, Thailand was close behind at $60.5 billion despite receiving fewer than half as many tourists. The UAE, with just 16.7 million visitors, generated $38.4 billion, reflecting a remarkably high average spend of $2,299 per tourist. Similarly, Saudi Arabia\'s revenue per tourist stood at $1,817. In contrast, Turkey and France recorded the lowest per-tourist spending at $674 and $714 respectively.',
    difficulty_band: '6.0-7.0',
    sort_order: 8
  },
  {
    task_type: 'task1',
    sub_type: 'process',
    title: 'How Solar Panels Generate Electricity',
    prompt: 'The diagram below shows how solar panels generate electricity for household use.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'process',
      steps: [
        { step: 1, label: 'Solar Radiation', description: 'Sunlight reaches the photovoltaic (PV) panels installed on the roof' },
        { step: 2, label: 'Photon Absorption', description: 'PV cells absorb photons, causing electrons to move and generate direct current (DC) electricity' },
        { step: 3, label: 'Inverter Conversion', description: 'The DC electricity flows to an inverter, which converts it to alternating current (AC)' },
        { step: 4, label: 'Distribution Panel', description: 'AC electricity passes through the distribution panel to power household appliances' },
        { step: 5, label: 'Excess Energy', description: 'Any surplus electricity is either stored in a battery system or fed back into the national grid' },
        { step: 6, label: 'Grid Connection', description: 'A smart meter records energy sent to the grid, allowing credits on the electricity bill' },
        { step: 7, label: 'Night/Cloud Usage', description: 'When solar generation is insufficient, electricity is drawn from the battery or the grid' }
      ]
    },
    template_structure: {
      introduction: 'Paraphrase — the process by which solar panels produce electricity for homes',
      overview: 'A 7-step process from sunlight capture to household usage, with a feedback loop for excess energy',
      body1: 'Steps 1-4: generation and conversion (sunlight → DC → AC → appliances)',
      body2: 'Steps 5-7: storage, grid connection, and backup supply'
    },
    key_phrases: [
      'the process begins when...',
      'at the next stage / following this',
      'the... is then converted into...',
      'this is subsequently distributed to...',
      'any surplus/excess... is...',
      'in the event that... is insufficient',
      'the final stage involves...',
      'the cycle is completed when...'
    ],
    model_answer_band7: 'The diagram illustrates the process by which solar panels produce electricity for residential use, from the initial capture of sunlight to the distribution of power within a household.\n\nOverall, the process involves seven stages, beginning with solar radiation and ending with a backup system for periods of low sunlight. The system includes both a direct usage pathway and a storage or grid feedback mechanism.\n\nThe process begins when sunlight strikes the photovoltaic panels installed on the roof. The PV cells absorb photons, which causes electrons to move and generate direct current electricity. This DC power then flows to an inverter, which converts it into alternating current, the standard form used by household appliances. The AC electricity is subsequently distributed through the home\'s distribution panel to power various devices.\n\nAny surplus energy produced is either stored in a battery system for later use or fed back into the national electricity grid. A smart meter tracks the energy exported, allowing homeowners to receive credits. During nighttime or cloudy conditions, when solar generation is insufficient, electricity is drawn from either the stored battery supply or the grid.',
    difficulty_band: '6.0-7.0',
    sort_order: 9
  },
  {
    task_type: 'task1',
    sub_type: 'process',
    title: 'Water Recycling System',
    prompt: 'The diagram below shows how wastewater is treated and recycled for reuse.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'process',
      steps: [
        { step: 1, label: 'Collection', description: 'Wastewater from homes and businesses is collected through underground pipes and directed to the treatment plant' },
        { step: 2, label: 'Screening', description: 'Large debris such as plastic, fabric, and stones are removed using metal screens' },
        { step: 3, label: 'Primary Treatment', description: 'Water enters a sedimentation tank where heavy solids settle to the bottom as sludge' },
        { step: 4, label: 'Biological Treatment', description: 'Bacteria are introduced to break down organic matter in aeration tanks' },
        { step: 5, label: 'Secondary Sedimentation', description: 'Water passes through a second settling tank to remove remaining suspended particles' },
        { step: 6, label: 'Filtration', description: 'Water is filtered through sand and activated carbon to remove fine impurities' },
        { step: 7, label: 'Disinfection', description: 'Chlorine or UV light is used to eliminate harmful microorganisms' },
        { step: 8, label: 'Distribution', description: 'Treated water is stored in reservoirs and distributed for irrigation, industrial use, or groundwater replenishment' }
      ]
    },
    template_structure: {
      introduction: 'Paraphrase — the process of treating and recycling wastewater',
      overview: 'An 8-step linear process from collection to distribution; involves physical, biological, and chemical treatment stages',
      body1: 'Steps 1-4: collection, physical screening, primary sedimentation, biological treatment',
      body2: 'Steps 5-8: secondary sedimentation, filtration, disinfection, distribution for reuse'
    },
    key_phrases: [
      'the process begins with the collection of...',
      'initially / at the first stage',
      'the water is then subjected to...',
      'this serves to remove/eliminate...',
      'following this, bacteria are used to...',
      'the treated water undergoes...',
      'the final stage involves...',
      'the recycled water is subsequently used for...'
    ],
    model_answer_band7: 'The diagram depicts the eight-stage process by which wastewater from residential and commercial sources is treated and recycled for various purposes.\n\nOverall, the system employs a combination of physical, biological, and chemical methods to purify water, transforming it from contaminated waste into a reusable resource suitable for irrigation, industry, and groundwater replenishment.\n\nThe process commences with the collection of wastewater through underground pipes leading to the treatment facility. At the screening stage, large items such as plastic and stones are removed using metal screens. The water then enters a primary sedimentation tank, where heavy solid particles settle to the bottom as sludge.\n\nSubsequently, bacteria are introduced in aeration tanks during the biological treatment phase to break down organic contaminants. The water then passes through a secondary sedimentation tank to remove remaining suspended matter. It is further purified through sand and activated carbon filters before being disinfected using chlorine or ultraviolet light. Finally, the clean water is stored in reservoirs and distributed for non-potable purposes including agricultural irrigation and industrial applications.',
    difficulty_band: '6.0-7.0',
    sort_order: 10
  },
  {
    task_type: 'task1',
    sub_type: 'map',
    title: 'Changes to a Town Centre (Before and After)',
    prompt: 'The two maps below show the centre of the town of Al-Madinah before and after redevelopment.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'map',
      before: {
        year: 2010,
        features: [
          { name: 'Traditional Market (Souq)', location: 'Centre', size: 'Large' },
          { name: 'Residential Houses', location: 'North and East', size: 'Medium area' },
          { name: 'Mosque', location: 'Centre-West', size: 'Small' },
          { name: 'Parking Area', location: 'South', size: 'Small' },
          { name: 'Park', location: 'East', size: 'Small' },
          { name: 'Main Road', location: 'Runs East-West through centre', size: 'Single lane' },
          { name: 'School', location: 'North-West', size: 'Medium' }
        ]
      },
      after: {
        year: 2023,
        features: [
          { name: 'Shopping Mall', location: 'Centre (replaced part of souq)', size: 'Large' },
          { name: 'Traditional Market (Souq)', location: 'Centre-East (reduced)', size: 'Small' },
          { name: 'Apartment Blocks', location: 'North (replaced houses)', size: 'Large area' },
          { name: 'Mosque', location: 'Centre-West (unchanged)', size: 'Expanded' },
          { name: 'Multi-storey Car Park', location: 'South (replaced parking)', size: 'Large' },
          { name: 'Public Garden', location: 'East (expanded park)', size: 'Medium' },
          { name: 'Main Road', location: 'Widened to dual carriageway', size: 'Dual lane' },
          { name: 'School', location: 'North-West (unchanged)', size: 'Medium' },
          { name: 'Metro Station', location: 'South-West (new)', size: 'Medium' }
        ]
      }
    },
    template_structure: {
      introduction: 'Paraphrase — changes to town centre, before and after redevelopment',
      overview: 'Significant modernisation — souq reduced, mall added, houses replaced by apartments, new transport infrastructure',
      body1: 'Changes to commercial and residential areas — souq→mall, houses→apartments',
      body2: 'Infrastructure changes — road widened, parking expanded, metro added; mosque and school largely unchanged'
    },
    key_phrases: [
      'the most significant change was...',
      'was replaced by / gave way to',
      'was expanded / enlarged / reduced in size',
      'remained unchanged / was retained',
      'a new... was constructed/built in the...',
      'the... was converted into / transformed into',
      'the area previously occupied by... became...',
      'in terms of transport, the main road was widened to...'
    ],
    model_answer_band7: 'The two maps illustrate the transformation of Al-Madinah town centre following a major redevelopment, comparing its layout in 2010 with its appearance in 2023.\n\nOverall, the town centre underwent substantial modernisation, with several traditional features being replaced by contemporary infrastructure. However, some key landmarks such as the mosque and school were preserved.\n\nThe most prominent change occurred in the centre, where a large portion of the traditional souq was replaced by a modern shopping mall. The remaining souq was reduced in size and relocated to the centre-east. In the north, the residential houses gave way to apartment blocks, reflecting a shift towards higher-density living.\n\nThe small parking area in the south was transformed into a multi-storey car park, and a new metro station was constructed in the south-west, significantly improving public transport links. The main road running through the centre was widened from a single lane to a dual carriageway. The small park in the east was expanded into a larger public garden. Meanwhile, the mosque was slightly enlarged, and the school in the north-west remained unchanged.',
    difficulty_band: '6.0-7.0',
    sort_order: 11
  },
  {
    task_type: 'task1',
    sub_type: 'mixed',
    title: 'Rainfall and Temperature Over 12 Months',
    prompt: 'The chart below shows the average monthly rainfall (in mm) and temperature (in °C) in a Middle Eastern coastal city over one year.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
    chart_data: {
      type: 'mixed',
      x_axis: 'Month',
      y_axis_left: 'Rainfall (mm)',
      y_axis_right: 'Temperature (°C)',
      chart_types: { rainfall: 'bar', temperature: 'line' },
      data: {
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        rainfall: [18, 15, 12, 5, 1, 0, 0, 0, 0, 3, 10, 20],
        temperature: [18, 20, 24, 28, 34, 38, 41, 41, 38, 32, 26, 20]
      }
    },
    template_structure: {
      introduction: 'Paraphrase — monthly rainfall and temperature in a Middle Eastern coastal city',
      overview: 'Inverse relationship — temperature peaks when rainfall is zero (summer); rainfall highest in winter when temperature is lowest',
      body1: 'Temperature pattern — cool winter (~18°C), hot summer (peaks at 41°C in Jul-Aug)',
      body2: 'Rainfall pattern — winter months have some rain (Dec highest at 20mm), virtually no rain Jun-Sep'
    },
    key_phrases: [
      'there is a clear inverse relationship between...',
      'temperatures peaked at... in...',
      'rainfall was at its highest during...',
      'the hottest months coincided with...',
      'virtually no precipitation was recorded between... and...',
      'temperatures ranged from a low of... to a high of...',
      'the wettest month was... with... mm of rainfall',
      'a marked contrast can be seen between...'
    ],
    model_answer_band7: 'The chart displays the average monthly rainfall and temperature in a Middle Eastern coastal city throughout the year, using bars for precipitation and a line for temperature.\n\nOverall, there is a clear inverse relationship between the two variables: temperatures are highest during the months with no rainfall, and precipitation occurs mainly during the cooler winter period.\n\nTemperatures followed a predictable pattern, rising steadily from 18°C in January to a peak of 41°C in both July and August. They then declined gradually through the autumn months, returning to 20°C by December. The hottest period, from May to September, saw temperatures consistently above 34°C.\n\nRainfall showed the opposite trend. The wettest months were December and January, receiving 20mm and 18mm respectively. Precipitation decreased through spring, dropping to just 1mm in May, and was entirely absent during the four summer months from June to September. Rain returned in October with 3mm, gradually increasing through November to the December peak.',
    difficulty_band: '6.0-7.0',
    sort_order: 12
  }
];

async function main() {
  console.log('Inserting 12 Writing Task 1 items...');

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const { data, error } = await supabase.from('ielts_writing_tasks').insert(task).select('id, title');
    if (error) {
      console.log(`❌ Task ${i+1} error:`, error.message);
    } else {
      console.log(`✅ Task ${i+1}: ${data[0].title}`);
    }
  }

  // Verify
  const { data: all } = await supabase.from('ielts_writing_tasks').select('id, sub_type, title').order('sort_order');
  console.log(`\n📊 Total Writing Task 1 items: ${all?.length}`);
  all?.forEach(t => console.log(`  - [${t.sub_type}] ${t.title}`));
}

main().catch(console.error);

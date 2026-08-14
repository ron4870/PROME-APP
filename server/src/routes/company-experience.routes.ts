import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Full 66 real-world project records extracted from PROME Experience PDF
const pdfProjectsSeed = [
  // A. Feasibility Studies and Design of Expressway Projects
  {
    itemNo: 1,
    projectNumber: 'PROME-EXP-01',
    category: 'Feasibility Studies and Design of Expressway Projects',
    duration: 'March 2016 to June 2020',
    projectName: 'Consultancy Services for Feasibility Study and Detailed Engineering Design of Kampala Outer Beltway',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Preparation of Drawings',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 6,342,048,583 (USD 1,865,308.40)',
    role: 'Sub Consultant in association with EGIS International',
    status: 'Completed',
    sector: 'Expressways & Highways',
    location: 'Kampala Outer Beltway, Uganda'
  },
  {
    itemNo: 2,
    projectNumber: 'PROME-EXP-02',
    category: 'Feasibility Studies and Design of Expressway Projects',
    duration: 'November 2016 to November 2017',
    projectName: 'Consultancy Services for feasibility study and detailed Engineering design of the VVIP express Route (Nakasero-Northern Bypass Route)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Preparation of Drawings',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 2,346,269,734 (USD 670,362.78)',
    role: 'Sub Consultant in Association with KUNHWA Engineering and Consulting',
    status: 'Completed',
    sector: 'Expressways & Highways',
    location: 'Kampala (Nakasero - Northern Bypass), Uganda'
  },
  {
    itemNo: 3,
    projectNumber: 'PROME-EXP-03',
    category: 'Feasibility Studies and Design of Expressway Projects',
    duration: 'February 2012 to October 2012',
    projectName: 'Design and Build of the Kampala-Entebbe Expressway (Length: 51km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Preparation of Drawings',
    client: 'China Communication Construction Company (CCCC)',
    clientAddress: 'CCCC Head Office',
    funder: 'China Communication Construction Company (CCCC) / GoU',
    country: 'Uganda',
    contractValue: 'USD 650,000 (UGX 1,560,000,000)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Expressways & Highways',
    location: 'Kampala - Entebbe, Uganda'
  },

  // B. Feasibility Studies and Design of Highway Projects
  {
    itemNo: 4,
    projectNumber: 'PROME-EXP-04',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: '27th March 2023 to date (Ongoing)',
    projectName: 'Consultancy Services for a Framework Contract for Feasibility Studies, Preliminary Engineering Designs, and Detailed Engineering Designs for Three (03) Years: Soroti-Serere-Pingire-Mugarama Road (64km) and Kituuma-Kapeeka-Butalangu (37km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 7,017,224,000',
    role: 'Sole Consultant',
    status: 'Ongoing',
    sector: 'Highways & Trunk Roads',
    location: 'Soroti-Serere & Kapeeka, Uganda'
  },
  {
    itemNo: 5,
    projectNumber: 'PROME-EXP-05',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'January 2019 to December 2019',
    projectName: 'Consultancy Services for Feasibility Study and Detailed Engineering Design of selected National Roads (8 lots), Lot 3: Humurwa-Kerere-Kanungu-Kanyantorogo-Butogota-Buhoma/Hamayanja-Ifasha-Ikuma Road (143km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Preparation of Drawings',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 450,945.00',
    role: 'Sub Consultant in Association with AIC Progetti',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Kanungu / Buhoma, Western Uganda'
  },
  {
    itemNo: 6,
    projectNumber: 'PROME-EXP-06',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'July 2018 to July 2019',
    projectName: 'Consultancy Services for Feasibility Study and Detailed Engineering Design-Lot 1: Kanoni-Misigi-Mityana (39km) and Bombo-Ndejje-Kalasa (19km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 514,295.30',
    role: 'Sub Consultant in Association with KUNHWA Engineering and Consulting',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Kanoni-Mityana & Bombo-Ndejje, Uganda'
  },
  {
    itemNo: 7,
    projectNumber: 'PROME-EXP-07',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'July 2018 to January 2019',
    projectName: 'Consultancy services for Detailed Engineering Design and construction supervision to Bituminous standards of Luku-Kalangala-Mulabana Road (65.6km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Preparation of Drawings',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 3,628,650,450 (USD 1,067,250.13)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Kalangala Island, Uganda'
  },
  {
    itemNo: 8,
    projectNumber: 'PROME-EXP-08',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'April 2019 to November 2020',
    projectName: 'Consultancy Services for Detailed Engineering Design of Luku-Kalangala-Mulabana road (65.6km) to Bituminous Standards: Addendum for Detailed Design of Kalangala Town Roads (11km) and 2 no. Landing Sites',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 1,804,654,565 (USD 487,744.47)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Kalangala Town & Landing Sites, Uganda'
  },
  {
    itemNo: 9,
    projectNumber: 'PROME-EXP-09',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'February 2013 to December 2014',
    projectName: 'Feasibility Study, Detailed Engineering Design, Tender Assistance and Project Management for Upgrading Roads to Bituminous Standards (Lot C) – Addendum for Kisubi-Nakawuka (27km), Nakawuka-Kasanje-Mpigi (20km), Nakawuka-Mawagulu-Nanziga-Maya (15km) and Kasaje-Buwaya Ferry (Lulongo) (9km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Preparation of Drawings',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 1,300,000',
    role: 'Sub Consultant in Association with Sheladia Associates from the United States',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Wakiso / Mpigi, Uganda'
  },
  {
    itemNo: 10,
    projectNumber: 'PROME-EXP-10',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'August 2010 to February 2011',
    projectName: 'Feasibility Study and Detailed Engineering designs for Upgrading of Kaabong-Sudan Border Road from Gravel to Bituminous Standard (Length: 44km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 390,000,000 (USD 162,500)',
    role: 'Lead Consultant in Association with Comptran Engineering',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Kaabong - South Sudan Border, Uganda'
  },
  {
    itemNo: 11,
    projectNumber: 'PROME-EXP-11',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'October 2009 to February 2011',
    projectName: 'Feasibility Study and Detailed Engineering designs for Upgrading Roads to Bitumen Standards Lot A: Rwenkunye-Apac-Lira-Kitgum-Musingo and Olwiyo-Gulu-Kitgum (Length: 450km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Preparation of Drawings',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 2,236,000,000 (USD 931,666.66)',
    role: 'Sub Consultant in Association with AIC Progetti of Italy',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Rwenkunye-Lira-Kitgum & Olwiyo-Gulu, Northern Uganda'
  },
  {
    itemNo: 12,
    projectNumber: 'PROME-EXP-12',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'October 2009 to February 2011',
    projectName: 'Feasibility Study and Detailed Engineering designs for Upgrading Roads to Bitumen Standards Lot B: Muyembe-Nakapiripirit-Moroto-Kotido and Soroti-Katakwi-Moroto-Loktanyala (Length: 500km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 1,358,933.33',
    role: 'Sub Consultant in Association with Arab Consulting Engineers (ACE) of Egypt',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Karamoja & Eastern Region, Uganda'
  },
  {
    itemNo: 13,
    projectNumber: 'PROME-EXP-13',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'October 2009 to February 2011',
    projectName: 'Feasibility Study and Detailed Engineering designs for Upgrading Roads to Bitumen Standards Lot C: Masaka-Bukakata, Mpigi-Maddu-Sembabule, Mukono-Kyetume-Katosi/Kisoga-Nyenga; and VillaMaria-Ssembabule roads (Length: 350km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Preparation of Drawings',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 1,300,000',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Masaka, Mpigi, Sembabule, Mukono, Uganda'
  },
  {
    itemNo: 14,
    projectNumber: 'PROME-EXP-14',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'January 2009 to September 2009',
    projectName: 'Feasibility Study and Detailed Engineering designs for Upgrading of Vurra-Arua-Oraba Road (Length: 100km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 1,040,000,000 (USD 472,727.27)',
    role: 'Sub Consultant in Association with COMPTRAN of Ghana',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Vurra - Arua - Oraba, West Nile, Uganda'
  },
  {
    itemNo: 15,
    projectNumber: 'PROME-EXP-15',
    category: 'Feasibility Studies and Design of Highway Projects',
    duration: 'September 2007 to December 2007',
    projectName: 'Detailed Engineering Designs for Upgrading of Itojo-Sempaya Road from Gravel to Bitumen Standard (Length: 20km)',
    deliverables: '• Traffic Surveys\n• Topographic and Cadastral Surveys\n• Geotechnical Investigations\n• Feasibility Study\n• Engineering Design\n• Environmental and Social Impact Assessment (ESIA)\n• Resettlement Action Plan (RAP)\n• Road safety audit studies\n• Preparation of Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Preparation of Drawings',
    client: 'Road Agency Formation Unit',
    clientAddress: 'Road Agency Formation Unit, Kampala',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 169,000 (UGX 371,800,000)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Highways & Trunk Roads',
    location: 'Itojo - Sempaya, Western Uganda'
  },

  // C. Feasibility Studies and Design of Bridges
  {
    itemNo: 16,
    projectNumber: 'PROME-EXP-16',
    category: 'Feasibility Studies and Design of Bridges',
    duration: '2012-2013',
    projectName: 'Consultancy Services for Detailed Engineering Design of Kyabayenze Bridge (25m) in Kasese District and Nyahuka-Mirambi Bridge in (25m) Bundibugyo District. Contract Ref: MoWT/CONS/20-21/00310',
    deliverables: '• Engineering Design report\n• Environmental Impact assessment report\n• Road safety audit report\n• Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Drawings',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 547,520,000 (USD 150,000 / USD 498,730.86 inclusive of taxes)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Bridges & Structures',
    location: 'Kasese & Bundibugyo Districts, Uganda'
  },
  {
    itemNo: 17,
    projectNumber: 'PROME-EXP-17',
    category: 'Feasibility Studies and Design of Bridges',
    duration: '2012-2013',
    projectName: 'Design and Build of Lotoketangisira Bridge (22.5m) on Kaabong Kapedo Road in Kaabong District (Lot 4). Contract Ref: UNRA/WORKS/2020-2021/00038/04',
    deliverables: '• Engineering Design report\n• Environmental Impact assessment report\n• Road safety audit report\n• Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Drawings',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 425,520,000 (USD 116,580 exclusive of taxes / USD 498,730.86)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Bridges & Structures',
    location: 'Kaabong District, Uganda'
  },

  // D. Feasibility Studies and Design of Urban/Town Road Projects
  {
    itemNo: 18,
    projectNumber: 'PROME-EXP-18',
    category: 'Feasibility Studies and Design of Urban/Town Road Projects',
    duration: '2012-2013',
    projectName: 'Consultancy Service for the Feasibility Study and Detailed Engineering Design of the proposed pilot Bus Rapid Transit (BRT) Project',
    deliverables: '• Engineering Design report\n• Environmental Impact assessment report\n• Resettlement Action Plan report\n• Road safety audit report\n• Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Drawings',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 1,845,304,200 (USD 498,730.86)',
    role: 'ARUP in association with PROME Consultants Limited',
    status: 'Completed',
    sector: 'Urban Infrastructure & Mass Transit',
    location: 'Kampala City, Uganda'
  },
  {
    itemNo: 19,
    projectNumber: 'PROME-EXP-19',
    category: 'Feasibility Studies and Design of Urban/Town Road Projects',
    duration: '20 Jan 2025 to 20 May 2025',
    projectName: 'Consultancy Services for the Design of a 2.08km NMT Extension along Speke Road, Shimoni Road, The Square 1, The Square 2, a Section of Buganda Road and Lumumba Avenue - KCCA/CONS/2024-2025/00031',
    deliverables: '• Engineering Design report\n• Road safety audit report\n• Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Drawings',
    client: 'Ministry of Lands, Housing and Urban Development (MLHUD) through USMID-AF',
    clientAddress: 'P.O. Box 3463 Kampala',
    funder: 'World Bank / USMID-AF / Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 394,403,626.9 (USD 105,174.3)',
    role: 'Sole Consultant',
    status: 'Ongoing',
    sector: 'Urban Infrastructure & NMT',
    location: 'Kampala Central Business District, Uganda'
  },
  {
    itemNo: 20,
    projectNumber: 'PROME-EXP-20',
    category: 'Feasibility Studies and Design of Urban/Town Road Projects',
    duration: 'January 2020 to March 2022',
    projectName: 'Consultancy Services For Engineering Designs, Preparation Of Environmental And Social Impact Assessments & Plans, Resettlement Action Plans And Tender Assistance For Urban Infra-structure Investments In Program Municipalities: Cluster 5: (ENTEBBE, MUBENDE, MASAKA)',
    deliverables: '• Engineering Design report\n• Environmental Impact assessment report\n• Resettlement Action Plan report\n• Road safety audit report\n• Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Drawings',
    client: 'Ministry of Lands, Housing and Urban Development (MLHUD) through USMID-AF',
    clientAddress: 'MLHUD Head Office, Kampala',
    funder: 'USMID-AF / World Bank',
    country: 'Uganda',
    contractValue: 'UGX 1,845,304,200 (USD 498,730.86)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Urban Infrastructure & Municipal Roads',
    location: 'Entebbe, Mubende, Masaka Municipalities, Uganda'
  },
  {
    itemNo: 21,
    projectNumber: 'PROME-EXP-21',
    category: 'Feasibility Studies and Design of Urban/Town Road Projects',
    duration: 'October 2012 to June 2013',
    projectName: 'Consultancy Services for Preparing Engineering Designs, Environmental Assessments and Resettlement Action Plan for Infrastructure Sub Projects in 14 Municipalities (Length: 50km)',
    deliverables: '• Feasibility Study report\n• Engineering Design report\n• Environmental Impact assessment report\n• Resettlement Action Plan report\n• Road safety audit report\n• Bidding documents\n• Unit rate analysis and confidential Engineers estimate\n• Tender Assistance',
    client: 'Ministry of Lands, Housing and Urban Development (USMID)',
    clientAddress: 'MLHUD Kampala',
    funder: 'World Bank / USMID',
    country: 'Uganda',
    contractValue: 'UGX 2,524,012,625 (USD 1,011,628.30)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Urban Infrastructure & Municipal Roads',
    location: '14 Municipalities Across Uganda'
  },
  {
    itemNo: 22,
    projectNumber: 'PROME-EXP-22',
    category: 'Feasibility Studies and Design of Urban/Town Road Projects',
    duration: '29th April 2024 to date (Ongoing)',
    projectName: 'Consultancy Services for Design of Access Road to Newrest, Additional Lanes into Toll Station and Junction',
    deliverables: '• Engineering Design report\n• Environmental Impact assessment report\n• Resettlement Action Plan report\n• Unit rate analysis and confidential Engineers estimate\n• Drawings',
    client: 'Uganda Civil Aviation Authority',
    clientAddress: 'P.O. Box 5536, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 103,000,000',
    role: 'Sole Consultant',
    status: 'Ongoing',
    sector: 'Urban Infrastructure & Airport Access',
    location: 'Entebbe International Airport Access, Uganda'
  },
  {
    itemNo: 23,
    projectNumber: 'PROME-EXP-23',
    category: 'Feasibility Studies and Design of Urban/Town Road Projects',
    duration: 'March 2021 to March 2023',
    projectName: 'Call off order under a framework contract for the provision of Engineering Consultancy Services for the Design of Mutungo Hill Road',
    deliverables: '• Engineering Design report\n• Drawings',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 94,470,800 (USD 25,532.64)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Urban Infrastructure & Municipal Roads',
    location: 'Mutungo Hill, Kampala, Uganda'
  },
  {
    itemNo: 24,
    projectNumber: 'PROME-EXP-24',
    category: 'Feasibility Studies and Design of Urban/Town Road Projects',
    duration: 'Feb 2019 to May 2019',
    projectName: 'Call off order under a framework contract for the provision of Engineering Consultancy Services for Review and Update of the Engineering Design, for dualling of the New Port bell Road and Kasubi-Kampala-Northern Bypass Road',
    deliverables: '• Engineering Design report\n• Environmental Impact assessment report\n• Resettlement Action Plan report\n• Tender Assistance\n• Bidding documents\n• Unit rate analysis and confidential Engineer’s estimate\n• Drawings',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 197,030,400 (USD 53,251.46)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Urban Infrastructure & Dualling Design',
    location: 'Port Bell & Kasubi, Kampala, Uganda'
  },
  {
    itemNo: 25,
    projectNumber: 'PROME-EXP-25',
    category: 'Feasibility Studies and Design of Urban/Town Road Projects',
    duration: '10th March 2015 to 10th July 2015',
    projectName: 'Call order No.9 Framework contract for provision of Road engineering consultancy services for detailed engineering designs of roads in Rubaga and Kawempe division, and an assessment to ascertain the required maintenance of Kisaasi Kyanja road in Nakawa Division (Length: 15km)',
    deliverables: '• Engineering Design report\n• Bidding documents\n• Unit rate analysis and confidential Engineer’s estimate',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 356,112,200 (USD 142,444.88)',
    role: 'Sole consultant',
    status: 'Completed',
    sector: 'Urban Infrastructure & Maintenance Audits',
    location: 'Rubaga, Kawempe & Nakawa Divisions, Kampala'
  },
  {
    itemNo: 26,
    projectNumber: 'PROME-EXP-26',
    category: 'Feasibility Studies and Design of Urban/Town Road Projects',
    duration: '16th July 2014 to 16th August 2014',
    projectName: 'Call order No. 5 Framework contract for provision of Road engineering consultancy services to update the strip map of roads under Kampala Institutional and Infrastructure development project (KIIDP2-phase 1)',
    deliverables: '• Inception report\n• Survey report',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 56,630,000 (USD 22,652)',
    role: 'Sole consultant',
    status: 'Completed',
    sector: 'Urban Infrastructure & GIS Strip Mapping',
    location: 'Kampala City, Uganda'
  },
  {
    itemNo: 27,
    projectNumber: 'PROME-EXP-27',
    category: 'Feasibility Studies and Design of Urban/Town Road Projects',
    duration: '10th June 2014 to 10th July 2014',
    projectName: 'Call order No.4 Framework contract for provision of Road engineering consultancy services setting out/establishment of road extents and channel reserves for specific roads (Makerere hill road, Mambule road, Kira road and Hoima roads) and drainage channels (Nalukolongo and Primary drains)',
    deliverables: '• Inception report\n• Survey report',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 43,066,000 (USD 17,944.16)',
    role: 'Sole consultant',
    status: 'Completed',
    sector: 'Urban Infrastructure & Cadastral Reserves',
    location: 'Kampala City Roads & Primary Channels, Uganda'
  },

  // E. Field Investigations and Data Collection Assignments
  {
    itemNo: 28,
    projectNumber: 'PROME-EXP-28',
    category: 'Field Investigations and Data Collection Assignments',
    duration: 'March 2021 to March 2024',
    projectName: 'Consultancy Services For a 3-Year Framework Contract For Data Collection on the Unpaved National Road Network-Lot 5: Western Region',
    deliverables: '• Data Collection Surveys Road GIS Surveys\n• Road Inventory and Condition Surveys\n• Bridge and Major Survey\n• Manual Classified Counts\n• Origin-Destination Surveys\n• Quality Assurance Plan\n• Health and Safety Plan\n• Health and Safety Measures\n• Knowledge Transfer to UNRA staff Reports',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 1,329,263,415 (USD 359,260.38)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'GIS & Pavement Condition Surveys',
    location: 'Western Region National Road Network, Uganda'
  },
  {
    itemNo: 29,
    projectNumber: 'PROME-EXP-29',
    category: 'Field Investigations and Data Collection Assignments',
    duration: '6th October 2023 - 31st May 2025',
    projectName: 'Environmental and Social Impact Assessment (ESIA) for Preparatory Survey for The Project for Construction of Karuma Bridge in Republic of Uganda',
    deliverables: '• Stakeholder mapping. Engagement and analysis\n• Baseline surveys\n• Preparation of scoping report\n• Environmental and social assessments\n• Preparation of ESIA Reports',
    client: 'Oriental Consultants Global Co., Ltd on behalf of UNRA',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'JICA / Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 84,428',
    role: 'Sole Consultant',
    status: 'Ongoing',
    sector: 'Environmental & Social Studies',
    location: 'Karuma Bridge, Kiryandongo / Nwoya, Uganda'
  },
  {
    itemNo: 30,
    projectNumber: 'PROME-EXP-30',
    category: 'Field Investigations and Data Collection Assignments',
    duration: '06 Jan 2023 to June 2023',
    projectName: 'RAP for Salaama Road (8.1Km) and Masiro Road (2.1Km) - KCCA/SUPLS/2022-2023/00339',
    deliverables: '• Cadastral surveys\n• Stakeholder mapping. Engagement and analysis\n• Land and property valuation\n• Preparation of RAP and Valuation Reports',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 281,737,555.0 (USD 75,130)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Cadastral Surveys & Resettlement Valuation',
    location: 'Salaama Road & Masiro Road, Kampala, Uganda'
  },
  {
    itemNo: 31,
    projectNumber: 'PROME-EXP-31',
    category: 'Field Investigations and Data Collection Assignments',
    duration: '2 June 2023 to 2 January 2024',
    projectName: 'Consultancy Services for the provision of ESIA for KCRRP (Package 2), -- KCCA/SUPLS/2022-2023/00652',
    deliverables: '• Stakeholder mapping. Engagement and analysis\n• Baseline surveys\n• Preparation of scoping report\n• Environmental and social assessments\n• Preparation of ESIA Reports',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 153,295,934.0 (USD 40,878.92)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Environmental & Social Studies',
    location: 'Kampala City, Uganda'
  },
  {
    itemNo: 32,
    projectNumber: 'PROME-EXP-32',
    category: 'Field Investigations and Data Collection Assignments',
    duration: '26 June 2023 to January 2024',
    projectName: 'Consultancy Services for the Update of Environmental and Social Impact Assessment (ESIA) for GKMA Roads',
    deliverables: '• Stakeholder mapping. Engagement and analysis\n• Baseline surveys\n• Preparation of scoping report\n• Environmental and social assessments\n• Preparation of ESIA Reports',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 770,831,240.0 (USD 205,555)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Environmental & Social Studies',
    location: 'Greater Kampala Metropolitan Area (GKMA), Uganda'
  },
  {
    itemNo: 33,
    projectNumber: 'PROME-EXP-33',
    category: 'Field Investigations and Data Collection Assignments',
    duration: '12th October 2021 to 30th November 2021',
    projectName: 'States Preference Surveys (SPS) for The Project for Integrated Urban Development Master Plan for Kampala Special Planning Area in the Republic of Uganda',
    deliverables: '• Stakeholder mapping and engagements\n• Preparation of surveys forms\n• Data collection and analysis\n• Preparation of States Preference Surveys (SPS) Report',
    client: 'Oriental Consultants Global Co., Ltd on behalf of KCCA',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'JICA / Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 27,476',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Traffic Modeling & Transportation Planning',
    location: 'Kampala Special Planning Area, Uganda'
  },
  {
    itemNo: 34,
    projectNumber: 'PROME-EXP-34',
    category: 'Field Investigations and Data Collection Assignments',
    duration: '17th June 2022 - 31st July 2022',
    projectName: 'Traffic Surveys and Forecasts the Project for the Construction of Karuma Bridge',
    deliverables: '• Preparation of traffic survey plan\n• Undertaking of MCCs, JTCs, OD surveys and axle load surveys\n• Traffic analysis and generation of traffic model\n• Preparation of Traffic Report',
    client: 'Oriental Consultants Global Co., Ltd on behalf of UNRA',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'JICA / Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 33,040',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Traffic Modeling & Axle Load Surveys',
    location: 'Karuma Bridge Crossing, Uganda'
  },
  {
    itemNo: 35,
    projectNumber: 'PROME-EXP-35',
    category: 'Field Investigations and Data Collection Assignments',
    duration: '12th September 2022 - 31st October 2022',
    projectName: 'OD Surveys the Project for the Construction of Karuma Bridge',
    deliverables: '• Preparation of traffic survey plan\n• Undertaking of MCCs, OD surveys and axle load surveys\n• Traffic analysis and updating of traffic model',
    client: 'Oriental Consultants Global Co., Ltd on behalf of UNRA',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'JICA / Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 14,573',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Traffic Modeling & Origin-Destination Surveys',
    location: 'Karuma Bridge Corridor, Uganda'
  },
  {
    itemNo: 36,
    projectNumber: 'PROME-EXP-36',
    category: 'Field Investigations and Data Collection Assignments',
    duration: '3rd January 2024 - 28th February 2024',
    projectName: 'Topographic Surveys for the Project for the Construction of Karuma Bridge',
    deliverables: '• Topographic surveys\n• Lidar surveys\n• Preparation of Topographic survey report',
    client: 'Oriental Consultants Global Co., Ltd on behalf of UNRA',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'JICA / Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 59,429',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Topographic LiDAR & Cadastral Surveys',
    location: 'Karuma Bridge, Uganda'
  },
  {
    itemNo: 37,
    projectNumber: 'PROME-EXP-37',
    category: 'Field Investigations and Data Collection Assignments',
    duration: '18th June 2023 - 31st July 2023',
    projectName: 'Traffic Survey for Preparatory Survey for Dar es Salaam Intersection Improvement Project in the United Republic of Tanzania',
    deliverables: '• Preparation of traffic survey plan\n• Undertaking of MCCs. JTCs, OD surveys and axle load surveys\n• Traffic analysis and generation of traffic model\n• Preparation of Traffic Report',
    client: 'Oriental Consultants Global Co., Ltd',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'JICA / Government of Tanzania',
    country: 'Tanzania',
    contractValue: 'USD 24,780',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Traffic Modeling & Intersection Engineering',
    location: 'Dar es Salaam, United Republic of Tanzania'
  },
  {
    itemNo: 38,
    projectNumber: 'PROME-EXP-38',
    category: 'Field Investigations and Data Collection Assignments',
    duration: '6th October 2023 - 31st May 2025',
    projectName: 'Environmental Impact Assessment and Social Condition Survey for Preparatory Survey for The Project for Construction of Karuma Bridge in Republic of Uganda',
    deliverables: '• Baseline environmental surveys\n• Stakeholder consultations\n• Scoping and ESIA Reports',
    client: 'Oriental Consultants Global Co., Ltd on behalf of UNRA',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'JICA / Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 114,145',
    role: 'Sole Consultant',
    status: 'Ongoing',
    sector: 'Environmental & Social Studies',
    location: 'Karuma Bridge, Uganda'
  },

  // F. Feasibility Studies and Design of Infrastructure Projects in Oil and GAS
  {
    itemNo: 39,
    projectNumber: 'PROME-EXP-39',
    category: 'Feasibility Studies and Design of Infrastructure Projects in Oil and GAS',
    duration: '1st October 2022 to March 2023',
    projectName: 'Consultancy Service for Feasibility Study, Design and Supervision of a Fish Landing Site at Buhuka Parish',
    deliverables: '• Feasibility study\n• Topographic surveys and bathometric surveys\n• Geotechnical Investigations\n• Architectural Designs\n• Structural Designs\n• Preparation Bills of Quantities\n• Preparation of Tender Documents\n• Preparation an ESIA',
    client: 'CNOOC UGANDA LIMITED',
    clientAddress: 'CNOOC Uganda Head Office, Kampala',
    funder: 'CNOOC Uganda Limited',
    country: 'Uganda',
    contractValue: 'USD 169,000',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Oil & Gas Infrastructure & Marine Civil Works',
    location: 'Buhuka Parish, Kingfisher Oil Field, Lake Albert, Uganda'
  },
  {
    itemNo: 40,
    projectNumber: 'PROME-EXP-40',
    category: 'Feasibility Studies and Design of Infrastructure Projects in Oil and GAS',
    duration: '2025',
    projectName: 'Kabale Oil Refinery Project Infrastructure Design & Hydraulics',
    deliverables: '• Lidar /Topographic Surveys\n• Environmental and Social Impact Assessment (ESIA)\n• Water intake Hydraulics and Hydrology',
    client: 'Maha Energies',
    clientAddress: 'Maha Energies Head Office',
    funder: 'Maha Energies',
    country: 'Uganda',
    contractValue: 'USD 1,428,998',
    role: 'Quarte Project Management Services FZCO in association with PROME Consultants Limited',
    status: 'Ongoing',
    sector: 'Oil & Gas Infrastructure & Industrial Hydraulics',
    location: 'Kabale Industrial Park, Hoima, Uganda'
  },

  // G. Feasibility Studies and Design of Building Projects
  {
    itemNo: 41,
    projectNumber: 'PROME-EXP-41',
    category: 'Feasibility Studies and Design of Building Projects',
    duration: '1st February 2011 to 6th May 2011',
    projectName: 'Consultancy Services for the Design of The Uganda Revenue Authority (URA) Headquarters',
    deliverables: '• Inception Report\n• Scheme Design Report\n• Environmental Impact Statement\n• Design Report and Drawings (Architectural & M&E)\n• Tender Documents\n• Final Structural Drawings\n• Final Architectural Drawings\n• Final Bill of Quantities; and\n• Project Completion Report',
    client: 'Uganda Revenue Authority',
    clientAddress: 'P.O. Box 7279, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'US$ 467,280',
    role: 'Sub Consultant in association with JE Nsubuga and Associates',
    status: 'Completed',
    sector: 'Commercial Buildings & High-Rise Structures',
    location: 'Nakawa, Kampala, Uganda'
  },

  // H. Development and Management of Asset Management Systems
  {
    itemNo: 42,
    projectNumber: 'PROME-EXP-42',
    category: 'Development and Management of Asset Management Systems',
    duration: '1 May 2025 to 1 Sept. 2025',
    projectName: 'Development and Implementation of an Effective Assets Maintenance Management System of KCCA Engineering Yard - KCCA/CONS/2024-2025/00045',
    deliverables: '• Asset management system software & database implementation\n• Engineering Yard fleet & machinery asset tracking\n• Maintenance workflow automation',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 198,683,519.4 (US$ 53,698)',
    role: 'Sole Consultant',
    status: 'Ongoing',
    sector: 'Asset Management Systems & Software',
    location: 'KCCA Engineering Yard, Kampala, Uganda'
  },

  // I. Design Review and Construction Supervision
  {
    itemNo: 43,
    projectNumber: 'PROME-EXP-43',
    category: 'Design Review and Construction Supervision',
    duration: '29th July 2024 to date (Ongoing)',
    projectName: 'Consultancy Services for the Construction Supervision of the Emergency Reconstruction of Selected Sections Along Kampala-Masaka Road Damaged By Floods Under Design And Build for Katonga Bridge (2.7km), Lwera Swamp (11.6km) and Kalandazi Swamp (1.5km)',
    deliverables: '▪ Design review report.\n▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Road safety report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 9,036,950,066.8',
    role: 'Sole Consultant',
    status: 'Ongoing',
    sector: 'Construction Supervision & Emergency Reconstruction',
    location: 'Katonga, Lwera & Kalandazi Swamps, Kampala-Masaka Highway'
  },
  {
    itemNo: 44,
    projectNumber: 'PROME-EXP-44',
    category: 'Design Review and Construction Supervision',
    duration: '1st April 2021 to date (Ongoing)',
    projectName: 'Consultancy Services of the Civil Works for the Reconstruction of Mityana-Mubende Road (86km) and Upgrading of Mityana Town Roads',
    deliverables: '▪ Quality control plan\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX 6,072,044,000',
    role: 'Sole Consultant',
    status: 'Ongoing',
    sector: 'Construction Supervision & Civil Works',
    location: 'Mityana - Mubende Highway, Uganda'
  },
  {
    itemNo: 45,
    projectNumber: 'PROME-EXP-45',
    category: 'Design Review and Construction Supervision',
    duration: 'March 2021 to date (Ongoing)',
    projectName: 'Consultancy Services for Construction Supervision of Korem–Sekota–Abi Adi Design and Build Project; Lot II: Lalibela Junction-Abergele',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Ethiopian Roads Authority',
    clientAddress: 'P.O. Box 1770 Addis Ababa Ethiopia, Tel: 551-71-70/79',
    funder: 'Government of Ethiopia',
    country: 'Ethiopia',
    contractValue: 'ETB 34,050,407.5 & USD 901,945',
    role: 'Lead Consultant in JV with Omega Consulting Engineers PLC (Ethiopia)',
    status: 'Ongoing',
    sector: 'Construction Supervision & International Roads',
    location: 'Lalibela Junction - Abergele, Ethiopia'
  },
  {
    itemNo: 46,
    projectNumber: 'PROME-EXP-46',
    category: 'Design Review and Construction Supervision',
    duration: 'November 2018 to date (Ongoing)',
    projectName: 'Consultancy Services for Construction Supervision of Jima-Agaro-Deddessa River Road Upgrading Project',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Ethiopian Roads Authority',
    clientAddress: 'P.O. Box 1770 Addis Ababa Ethiopia, Tel: 551-71-70/79',
    funder: 'Government of Ethiopia',
    country: 'Ethiopia',
    contractValue: 'ETB 33,500,000 & USD 100,000',
    role: 'Sub Consultant in JV with Omega Consulting Engineers PLC (Ethiopia)',
    status: 'Ongoing',
    sector: 'Construction Supervision & International Roads',
    location: 'Jima - Agaro - Deddessa River, Ethiopia'
  },
  {
    itemNo: 47,
    projectNumber: 'PROME-EXP-47',
    category: 'Design Review and Construction Supervision',
    duration: '23rd April 2018 to 17th May 2023',
    projectName: 'Consultancy Services For The Construction Supervision Of Design and Build Contract; Masindi (Kisanja)-Park Junction (Lot 7) And Tangi Junction-Paraa-Buliisa (Lot 8) Upgrading Project (Length: 159km)',
    deliverables: '▪ Design review report.\n▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Road safety report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 217,916,518.40',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Oil Corridor Roads',
    location: 'Masindi - Paraa - Buliisa, Albertine Oil Region, Uganda'
  },
  {
    itemNo: 48,
    projectNumber: 'PROME-EXP-48',
    category: 'Design Review and Construction Supervision',
    duration: '19 May 2021 plus 4 years Construction and 2 Year DLP',
    projectName: 'Consultancy Services for Construction Supervision of Woito-Turmi Design and Build Road Project',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n▪ Final accounts',
    client: 'Ethiopian Roads Authority / Ethiopian Government',
    clientAddress: 'Addis Ababa, Ethiopia',
    funder: 'Government of Ethiopia',
    country: 'Ethiopia',
    contractValue: 'Equivalent of USD 2,121,418.77 i.e. (ETB: 55,531,775.00 plus USD: 721,223)',
    role: 'Lead Consultant in JV with Omega Consulting Engineers',
    status: 'Ongoing',
    sector: 'Construction Supervision & International Roads',
    location: 'Woito - Turmi, Ethiopia'
  },
  {
    itemNo: 49,
    projectNumber: 'PROME-EXP-49',
    category: 'Design Review and Construction Supervision',
    duration: '29 August 2019 plus 3 years and 1 year DLP',
    projectName: 'Consultancy Services for Construction Supervision of Korem-Sekita-Abiadi Road Project, Lot II: Km 71+900-Km 155+000',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n▪ Final accounts',
    client: 'Ethiopian Roads Authority / Ethiopian Government',
    clientAddress: 'Addis Ababa, Ethiopia',
    funder: 'Government of Ethiopia',
    country: 'Ethiopia',
    contractValue: 'Equivalent of USD 2,140,141.64 i.e. (ETB: 34,050,407.5 plus USD 901,945.00)',
    role: 'Lead Consultant in JV with Omega Consulting Engineers',
    status: 'Completed',
    sector: 'Construction Supervision & International Roads',
    location: 'Korem - Sekita - Abiadi, Ethiopia'
  },
  {
    itemNo: 50,
    projectNumber: 'PROME-EXP-50',
    category: 'Design Review and Construction Supervision',
    duration: 'May 2020 to March 2023',
    projectName: 'Consultancy Services for Construction Supervision of 2 landing sites at Buvuma and Kiyindi (Lot 1)',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Ministry of Agriculture, Animal Industries and Fisheries',
    clientAddress: 'Entebbe, Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 205,786 (UGX 761,410,000)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Marine Landing Sites',
    location: 'Buvuma Island & Kiyindi Landing Site, Lake Victoria'
  },
  {
    itemNo: 51,
    projectNumber: 'PROME-EXP-51',
    category: 'Design Review and Construction Supervision',
    duration: '15th January 2015 to 15th March 2022 (Length: 105km)',
    projectName: 'Construction Supervision of the Upgrading of Konso-Yabelo Road Project',
    deliverables: '▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Ethiopian Roads Authority',
    clientAddress: 'P.O. Box 1770 Addis Ababa Ethiopia, Tel: 551-71-70/79',
    funder: 'International Development Association / World Bank',
    country: 'Ethiopia',
    contractValue: 'ETB 15,659,600 & USD 599,600',
    role: 'JV with OMEGA Consulting Engineers PLC (Ethiopia)',
    status: 'Completed',
    sector: 'Construction Supervision & International Roads',
    location: 'Konso - Yabelo, Ethiopia'
  },
  {
    itemNo: 52,
    projectNumber: 'PROME-EXP-52',
    category: 'Design Review and Construction Supervision',
    duration: 'May 2019 to 21st November 2022',
    projectName: 'Framework Contract for Provision of Road Engineering Consultancy Services including Supervision of works on Upper Kololo Road, Old Taxi Park, Cecilia Road',
    deliverables: '▪ Quality control plan\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 977,173 (UGX 3,615,542,560)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Urban Infrastructure',
    location: 'Upper Kololo Road & Old Taxi Park, Kampala, Uganda'
  },
  {
    itemNo: 53,
    projectNumber: 'PROME-EXP-53',
    category: 'Design Review and Construction Supervision',
    duration: '14th April 2022 to 28th October 2022',
    projectName: 'Call order No: D00076 Framework contract for provision of Road engineering consultancy services for Reconstruction/Upgrading of Kizanyilo roads (1.32km) in Kawempe Division',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n• Final accounts',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX. 485,099,008',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Urban Roads',
    location: 'Kizanyilo Roads, Kawempe Division, Kampala, Uganda'
  },
  {
    itemNo: 54,
    projectNumber: 'PROME-EXP-54',
    category: 'Design Review and Construction Supervision',
    duration: '14th April 2022 to 14th October 2022',
    projectName: 'Call order No: D00078 Framework contract for provision of Road engineering consultancy services for Reconstruction/Upgrading of St Peter’s Kanyanya roads (1.12km) in Kawempe Division',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n• Final accounts',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX. 485,099,008',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Urban Roads',
    location: 'St Peter’s Kanyanya Roads, Kawempe Division, Kampala'
  },
  {
    itemNo: 55,
    projectNumber: 'PROME-EXP-55',
    category: 'Design Review and Construction Supervision',
    duration: '14th April 2022 to 14th October 2022',
    projectName: 'Call order No: D00080 Framework contract for provision of Road engineering consultancy services for Reconstruction/Upgrading of Mulago Cancer Institute Road and Ndayemuka roads (1.2km) in Kawempe Division',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n• Final accounts',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'UGX. 485,099,008',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Medical Access Roads',
    location: 'Mulago Cancer Institute Access & Ndayemuka, Kampala'
  },
  {
    itemNo: 56,
    projectNumber: 'PROME-EXP-56',
    category: 'Design Review and Construction Supervision',
    duration: 'February 2016 to December 2020 (Length: 107km)',
    projectName: 'Supervision of the design and Build contract for Mubende-Kakumiro-Kibaale-Kagadi Road',
    deliverables: '▪ Inception Report\n▪ Design review report\n▪ Monthly progress report\n▪ Quarterly progress report\n▪ Annual Progress report\n▪ Design and construction contract completion report\n▪ Consultancy completion Report\n• Consultants’ quarterly assurance manual',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 3,556,942',
    role: 'Sub Consultant in Association with AIC Projetti',
    status: 'Completed',
    sector: 'Construction Supervision & Trunk Roads',
    location: 'Mubende - Kakumiro - Kibaale - Kagadi, Uganda'
  },
  {
    itemNo: 57,
    projectNumber: 'PROME-EXP-57',
    category: 'Design Review and Construction Supervision',
    duration: 'June 2016 to December 2019',
    projectName: 'Design Update and Construction of Selected City Roads Lot 2: Construction and Upgrading of Jakaana Road (0.65Km), Nsoba Road (0.75Km), Kafeero Road (0.8Km), Muganzi-Awongera (1.6Km) and Waligo Road (4.2Km), in Kawempe Division and Bakuli market lane (1.0 Km), Nakibinge-Bawalakata Road (2.9Km), Sembera Road (1.5Km), and Box Culvert at Sembule and Nalukolongo Channel in Lubaga Division',
    deliverables: '▪ Design Update Reports\n▪ Drawings\n▪ Quality control plan\n▪ Contractor’s mobilization report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 877,096 (UGX 3,245,255,600)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Urban Drainage',
    location: 'Kawempe & Lubaga Divisions, Kampala, Uganda'
  },
  {
    itemNo: 58,
    projectNumber: 'PROME-EXP-58',
    category: 'Design Review and Construction Supervision',
    duration: '04th November 2014 to 31st March 2018 (Length: 77km)',
    projectName: 'Design Review and Construction Supervision of Gulu-Acholibur Road',
    deliverables: '▪ Design review report.\n▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Road safety report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts.',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 1,082,606.25 (UGX.3,897,382,500)',
    role: 'Lead Consultant in association with OMEGA Consulting Engineers PLC (Ethiopia)',
    status: 'Completed',
    sector: 'Construction Supervision & Highway Design Review',
    location: 'Gulu - Acholibur, Northern Uganda'
  },
  {
    itemNo: 59,
    projectNumber: 'PROME-EXP-59',
    category: 'Design Review and Construction Supervision',
    duration: '17th March 2015 to 17th April 2017',
    projectName: 'Design Review and Construction supervision of the Design and Build Works for Ntugwe, Mitaano, Birara Bridges in Kanungu/Rukungiri Districts',
    deliverables: '▪ Design review report\n▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 613,981.04 (UGX.2,210,331,760)',
    role: 'Sole Consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Major Bridges',
    location: 'Ntugwe, Mitaano & Birara Bridges, Kanungu/Rukungiri'
  },
  {
    itemNo: 60,
    projectNumber: 'PROME-EXP-60',
    category: 'Design Review and Construction Supervision',
    duration: '15th January 2014 to 28th September 2016',
    projectName: 'Design review and Construction Supervision of the upgrading of Lugoba Road (3.85Km), Bahai Road (2.85Km), Kawala Road (2.0Km) and Kyebando Central Road (1.0Km) in Kawempe Division',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Engineering design review report\n▪ Drawings\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 429,922 (UGX 1,590,710,000)',
    role: 'Sole consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Urban Upgrading',
    location: 'Lugoba, Bahai, Kawala & Kyebando, Kawempe, Kampala'
  },
  {
    itemNo: 61,
    projectNumber: 'PROME-EXP-61',
    category: 'Design Review and Construction Supervision',
    duration: '15th January 2014 to 28th September 2015',
    projectName: 'Design review and Construction Supervision of the upgrading of Mutundwe Road (4.5Km), Weranga Road (2.45Km) and Wansao Road (0.18Km) in Lubaga division',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Engineering design review report\n▪ Drawings\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Kampala Capital City Authority',
    clientAddress: 'P.O. Box 3463 Kampala, Tel: 0772401781',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 429,922 (UGX 1,590,710,000)',
    role: 'Sole consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Urban Upgrading',
    location: 'Mutundwe, Weranga & Wansao Roads, Lubaga, Kampala'
  },
  {
    itemNo: 62,
    projectNumber: 'PROME-EXP-62',
    category: 'Design Review and Construction Supervision',
    duration: 'October 2012 to June 2015',
    projectName: 'Construction Supervision of Ferry Landing Sites on Lake Bisina at Okokorio and Agule',
    deliverables: '▪ Quality control plan\n▪ Topographic Surveys\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Ministry of Works and Transport',
    clientAddress: 'Ministry of Works and Transport, Kampala',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 91,803.57 (UGX 257,050,000)',
    role: 'Sole consultant',
    status: 'Completed',
    sector: 'Construction Supervision & Marine Infra',
    location: 'Lake Bisina (Okokorio & Agule), Uganda'
  },
  {
    itemNo: 63,
    projectNumber: 'PROME-EXP-63',
    category: 'Design Review and Construction Supervision',
    duration: 'February 2011 to August 2014 (Length: 68km)',
    projectName: 'Construction supervision of the Upgrading of Nyakaita-Kazo Road',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'African Development Bank',
    country: 'Uganda',
    contractValue: 'USD 888,333.33 (UGX 2,132,000,000)',
    role: 'Sub Consultant in association with JBURROW',
    status: 'Completed',
    sector: 'Construction Supervision & AfDB Infrastructure',
    location: 'Nyakaita - Kazo, Western Uganda'
  },
  {
    itemNo: 64,
    projectNumber: 'PROME-EXP-64',
    category: 'Design Review and Construction Supervision',
    duration: 'February 2011 to August 2014 (Length: 78km)',
    projectName: 'Construction Supervision of the Upgrading of Kazo-Kamwenge Road',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'African Development Bank',
    country: 'Uganda',
    contractValue: 'USD 357,500 (UGX 858,000,000)',
    role: 'Sub Consultant in association with SNC Lavalin of Canada',
    status: 'Completed',
    sector: 'Construction Supervision & AfDB Infrastructure',
    location: 'Kazo - Kamwenge, Western Uganda'
  },
  {
    itemNo: 65,
    projectNumber: 'PROME-EXP-65',
    category: 'Design Review and Construction Supervision',
    duration: 'February 2011 to August 2014 (Length: 240km)',
    projectName: 'Construction Supervision of the Reconstruction of Tororo-Mbale-Soroti and Mukono-Jinja Road',
    deliverables: '▪ Quality control plan\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 499,113.33 (UGX 1,197,872,000)',
    role: 'Sub Consultant in association with GIBB East Africa',
    status: 'Completed',
    sector: 'Construction Supervision & Highway Reconstruction',
    location: 'Tororo-Mbale-Soroti & Mukono-Jinja Corridors'
  },
  {
    itemNo: 66,
    projectNumber: 'PROME-EXP-66',
    category: 'Design Review and Construction Supervision',
    duration: 'January 2011 to September 2016',
    projectName: 'Consultancy Services for Supervision of Construction of Bridge Structures, Box Culverts and Ferry Landing Sites Along Atiak-Moyo-Afoji Road',
    deliverables: '▪ Quality control plan\n▪ Topographic Surveys\n▪ Contractor’s mobilisation report\n▪ Inception report\n▪ Monthly progress report\n▪ Project completion report\n▪ Interim payment certificates\n• Final accounts',
    client: 'Uganda National Roads Authority',
    clientAddress: 'P.O. Box 28487, Kampala Uganda',
    funder: 'Government of Uganda',
    country: 'Uganda',
    contractValue: 'USD 850,416.66 (UGX 2,041,000,000)',
    role: 'Lead Consultant in JV with Comptran',
    status: 'Completed',
    sector: 'Construction Supervision & Bridge Structures',
    location: 'Atiak - Moyo - Afoji Road Corridor, West Nile'
  }
];

// Helper to seed or reseed all records
async function seedAllRecords(userId?: number) {
  // Delete all existing records
  await prisma.companyExperience.deleteMany({});

  for (const proj of pdfProjectsSeed) {
    await prisma.companyExperience.create({
      data: {
        itemNo: proj.itemNo,
        projectNumber: proj.projectNumber,
        projectName: proj.projectName,
        category: proj.category,
        duration: proj.duration,
        deliverables: proj.deliverables,
        client: proj.client,
        clientAddress: proj.clientAddress,
        funder: proj.funder,
        country: proj.country,
        contractValue: proj.contractValue,
        role: proj.role,
        status: proj.status,
        sector: proj.sector,
        location: proj.location,
        createdById: userId || null
      }
    });
  }
}

// Get all company experience records
router.get('/', authenticateToken, async (req, res) => {
  try {
    let records = await prisma.companyExperience.findMany({
      include: {
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { itemNo: 'asc' }
    });

    // Auto-seed if table is empty or has fewer records than expected
    if (records.length < 50) {
      await seedAllRecords((req as any).user?.userId);
      records = await prisma.companyExperience.findMany({
        include: {
          createdBy: { select: { id: true, name: true } }
        },
        orderBy: { itemNo: 'asc' }
      });
    }

    res.json(records);
  } catch (error) {
    console.error('Failed to fetch company experiences:', error);
    res.status(500).json({ message: 'Failed to fetch company experience records' });
  }
});

// Force Reseed endpoint
router.post('/reseed', authenticateToken, async (req: any, res) => {
  try {
    await seedAllRecords(req.user?.userId);
    const records = await prisma.companyExperience.findMany({
      include: {
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { itemNo: 'asc' }
    });
    res.json({ message: 'Reseeded successfully', count: records.length, records });
  } catch (error) {
    console.error('Failed to reseed company experience:', error);
    res.status(500).json({ message: 'Failed to reseed database' });
  }
});

// Create a new experience record
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { projectName, client, category, duration, funder, clientAddress, country, contractValue, role, deliverables, status, sector, location } = req.body;

    const count = await prisma.companyExperience.count();
    const nextItemNo = count + 1;
    const projectNumber = `PROME-EXP-${nextItemNo.toString().padStart(2, '0')}`;

    const newRecord = await prisma.companyExperience.create({
      data: {
        itemNo: nextItemNo,
        projectNumber,
        projectName: projectName || 'New Engineering Project Experience',
        category: category || 'Feasibility Studies and Design of Highway Projects',
        duration: duration || '2025 to date',
        client: client || 'Client / Employer',
        funder: funder || 'Government of Uganda',
        clientAddress: clientAddress || null,
        country: country || 'Uganda',
        contractValue: contractValue || null,
        role: role || 'Sole Consultant',
        deliverables: deliverables || null,
        status: status || 'Completed',
        sector: sector || 'Civil & Infrastructure',
        location: location || 'Uganda',
        createdById: req.user?.userId || null
      },
      include: {
        createdBy: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Failed to create company experience:', error);
    res.status(500).json({ message: 'Failed to create company experience record' });
  }
});

// Get specific experience record
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const record = await prisma.companyExperience.findUnique({
      where: { id: parseInt(id) },
      include: {
        createdBy: { select: { id: true, name: true } }
      }
    });

    if (!record) return res.status(404).json({ message: 'Company experience record not found' });
    res.json(record);
  } catch (error) {
    console.error('Failed to fetch company experience record:', error);
    res.status(500).json({ message: 'Failed to fetch company experience record' });
  }
});

// Update experience record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectName, client, category, duration, funder, clientAddress, country, contractValue, role, deliverables, status, sector, location, description, scopeOfServices, clientContact } = req.body;

    const updated = await prisma.companyExperience.update({
      where: { id: parseInt(id) },
      data: {
        projectName,
        client,
        category,
        duration,
        funder,
        clientAddress,
        country,
        contractValue,
        role,
        deliverables,
        status,
        sector,
        location,
        description,
        scopeOfServices,
        clientContact
      },
      include: {
        createdBy: { select: { id: true, name: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update company experience record:', error);
    res.status(500).json({ message: 'Failed to update company experience record' });
  }
});

// Delete experience record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.companyExperience.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Failed to delete company experience record:', error);
    res.status(500).json({ message: 'Failed to delete company experience record' });
  }
});

export default router;

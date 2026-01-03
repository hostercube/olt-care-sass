// Complete Bangladesh Administrative Divisions Data
// Division -> District -> Upazila/Thana

export const DIVISIONS = [
  'Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh'
];

export const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  'Dhaka': [
    'Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 
    'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 
    'Rajbari', 'Shariatpur', 'Tangail'
  ],
  'Chittagong': [
    'Chittagong', 'Bandarban', 'Brahmanbaria', 'Chandpur', 'Comilla', 
    "Cox's Bazar", 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati'
  ],
  'Rajshahi': [
    'Rajshahi', 'Bogra', 'Chapainawabganj', 'Joypurhat', 'Naogaon', 
    'Natore', 'Nawabganj', 'Pabna', 'Sirajganj'
  ],
  'Khulna': [
    'Khulna', 'Bagerhat', 'Chuadanga', 'Jessore', 'Jhenaidah', 
    'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'
  ],
  'Barisal': [
    'Barisal', 'Barguna', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'
  ],
  'Sylhet': [
    'Sylhet', 'Habiganj', 'Moulvibazar', 'Sunamganj'
  ],
  'Rangpur': [
    'Rangpur', 'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 
    'Nilphamari', 'Panchagarh', 'Thakurgaon'
  ],
  'Mymensingh': [
    'Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur'
  ]
};

export const UPAZILAS_BY_DISTRICT: Record<string, string[]> = {
  // Dhaka Division
  'Dhaka': [
    'Dhamrai', 'Dohar', 'Keraniganj', 'Nawabganj', 'Savar',
    'Adabor', 'Badda', 'Bangshal', 'Bimanbandar', 'Cantonment', 
    'Chak Bazar', 'Darus Salam', 'Demra', 'Dhanmondi', 'Gendaria',
    'Gulshan', 'Hazaribagh', 'Jatrabari', 'Kadamtali', 'Kafrul',
    'Kalabagan', 'Kamrangirchar', 'Khilgaon', 'Khilkhet', 'Kotwali',
    'Lalbagh', 'Mirpur', 'Mohammadpur', 'Motijheel', 'New Market',
    'Pallabi', 'Paltan', 'Ramna', 'Rampura', 'Sabujbagh', 
    'Shah Ali', 'Shahbagh', 'Sher-e-Bangla Nagar', 'Shyampur', 'Sutrapur',
    'Tejgaon', 'Tejgaon Industrial Area', 'Turag', 'Uttara', 'Uttarkhan', 'Wari'
  ],
  'Faridpur': [
    'Alfadanga', 'Bhanga', 'Boalmari', 'Charbhadrasan', 'Faridpur Sadar', 
    'Madhukhali', 'Nagarkanda', 'Sadarpur', 'Saltha'
  ],
  'Gazipur': [
    'Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur', 'Tongi'
  ],
  'Gopalganj': [
    'Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'
  ],
  'Kishoreganj': [
    'Austagram', 'Bajitpur', 'Bhairab', 'Hossainpur', 'Itna', 
    'Karimganj', 'Katiadi', 'Kishoreganj Sadar', 'Kuliarchar', 'Mithamain', 
    'Nikli', 'Pakundia', 'Tarail'
  ],
  'Madaripur': [
    'Kalkini', 'Madaripur Sadar', 'Rajoir', 'Shibchar'
  ],
  'Manikganj': [
    'Daulatpur', 'Ghior', 'Harirampur', 'Manikganj Sadar', 'Saturia', 
    'Shibalaya', 'Singair'
  ],
  'Munshiganj': [
    'Gazaria', 'Lohajang', 'Munshiganj Sadar', 'Sirajdikhan', 
    'Sreenagar', 'Tongibari'
  ],
  'Narayanganj': [
    'Araihazar', 'Bandar', 'Narayanganj Sadar', 'Rupganj', 'Sonargaon',
    'Fatullah', 'Siddhirganj'
  ],
  'Narsingdi': [
    'Belabo', 'Monohardi', 'Narsingdi Sadar', 'Palash', 'Raipura', 'Shibpur'
  ],
  'Rajbari': [
    'Baliakandi', 'Goalandaghat', 'Kalukhali', 'Pangsha', 'Rajbari Sadar'
  ],
  'Shariatpur': [
    'Bhedarganj', 'Damudya', 'Gosairhat', 'Naria', 'Shariatpur Sadar', 'Zajira'
  ],
  'Tangail': [
    'Basail', 'Bhuapur', 'Delduar', 'Dhanbari', 'Ghatail', 
    'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 
    'Sakhipur', 'Tangail Sadar'
  ],

  // Chittagong Division
  'Chittagong': [
    'Anwara', 'Banshkhali', 'Boalkhali', 'Chandanaish', 'Fatikchhari',
    'Hathazari', 'Karnaphuli', 'Lohagara', 'Mirsharai', 'Patiya',
    'Rangunia', 'Raozan', 'Sandwip', 'Satkania', 'Sitakunda',
    'Bakalia', 'Bandar', 'Bayazid Bostami', 'Chandgaon', 'Double Mooring',
    'Halishahar', 'Khulshi', 'Kotwali', 'Pahartali', 'Panchlaish',
    'Patenga', 'Port', 'Sadarghat'
  ],
  'Bandarban': [
    'Ali Kadam', 'Bandarban Sadar', 'Lama', 'Naikhongchhari', 
    'Rowangchhari', 'Ruma', 'Thanchi'
  ],
  'Brahmanbaria': [
    'Akhaura', 'Ashuganj', 'Bancharampur', 'Bijoynagar', 'Brahmanbaria Sadar',
    'Kasba', 'Nabinagar', 'Nasirnagar', 'Sarail'
  ],
  'Chandpur': [
    'Chandpur Sadar', 'Faridganj', 'Haimchar', 'Haziganj', 'Kachua',
    'Matlab Dakshin', 'Matlab Uttar', 'Shahrasti'
  ],
  'Comilla': [
    'Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram',
    'Comilla Sadar', 'Comilla Sadar Dakshin', 'Daudkandi', 'Debidwar', 
    'Homna', 'Laksam', 'Lalmai', 'Meghna', 'Monohorgonj', 
    'Muradnagar', 'Nangalkot', 'Titas'
  ],
  "Cox's Bazar": [
    'Chakaria', "Cox's Bazar Sadar", 'Kutubdia', 'Maheshkhali', 'Pekua',
    'Ramu', 'Teknaf', 'Ukhia'
  ],
  'Feni': [
    'Chhagalnaiya', 'Daganbhuiyan', 'Feni Sadar', 'Fulgazi', 
    'Parshuram', 'Sonagazi'
  ],
  'Khagrachhari': [
    'Dighinala', 'Khagrachhari Sadar', 'Lakshmichhari', 'Mahalchhari',
    'Manikchhari', 'Matiranga', 'Panchhari', 'Ramgarh'
  ],
  'Lakshmipur': [
    'Kamalnagar', 'Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati'
  ],
  'Noakhali': [
    'Begumganj', 'Chatkhil', 'Companiganj', 'Hatiya', 'Kabirhat',
    'Noakhali Sadar', 'Senbagh', 'Sonaimuri', 'Subarnachar'
  ],
  'Rangamati': [
    'Baghaichhari', 'Barkal', 'Belaichhari', 'Juraichhari', 'Kaptai',
    'Kaukhali', 'Langadu', 'Naniarchar', 'Rajasthali', 'Rangamati Sadar'
  ],

  // Rajshahi Division
  'Rajshahi': [
    'Bagha', 'Bagmara', 'Charghat', 'Durgapur', 'Godagari',
    'Mohanpur', 'Paba', 'Puthia', 'Rajshahi Sadar', 'Tanore',
    'Boalia', 'Matihar', 'Rajpara', 'Shah Makhdum'
  ],
  'Bogra': [
    'Adamdighi', 'Bogra Sadar', 'Dhunat', 'Dhupchanchia', 'Gabtali',
    'Kahaloo', 'Nandigram', 'Sariakandi', 'Shajahanpur', 'Sherpur',
    'Shibganj', 'Sonatola'
  ],
  'Chapainawabganj': [
    'Bholahat', 'Chapainawabganj Sadar', 'Gomastapur', 'Nachole', 'Shibganj'
  ],
  'Joypurhat': [
    'Akkelpur', 'Joypurhat Sadar', 'Kalai', 'Khetlal', 'Panchbibi'
  ],
  'Naogaon': [
    'Atrai', 'Badalgachhi', 'Dhamoirhat', 'Mahadebpur', 'Manda',
    'Naogaon Sadar', 'Niamatpur', 'Patnitala', 'Porsha', 'Raninagar', 'Sapahar'
  ],
  'Natore': [
    'Bagatipara', 'Baraigram', 'Gurudaspur', 'Lalpur', 'Natore Sadar', 'Singra'
  ],
  'Nawabganj': [
    'Bholahat', 'Gomastapur', 'Nachole', 'Nawabganj Sadar', 'Shibganj'
  ],
  'Pabna': [
    'Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 'Faridpur',
    'Ishwardi', 'Pabna Sadar', 'Santhia', 'Sujanagar'
  ],
  'Sirajganj': [
    'Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur', 'Raiganj',
    'Shahjadpur', 'Sirajganj Sadar', 'Tarash', 'Ullahpara'
  ],

  // Khulna Division
  'Khulna': [
    'Batiaghata', 'Dacope', 'Daulatpur', 'Dighalia', 'Dumuria',
    'Khalishpur', 'Khan Jahan Ali', 'Khulna Sadar', 'Koyra', 'Paikgachha',
    'Phultala', 'Rupsha', 'Sonadanga', 'Terokhada'
  ],
  'Bagerhat': [
    'Bagerhat Sadar', 'Chitalmari', 'Fakirhat', 'Kachua', 'Mollahat',
    'Mongla', 'Morrelganj', 'Rampal', 'Sarankhola'
  ],
  'Chuadanga': [
    'Alamdanga', 'Chuadanga Sadar', 'Damurhuda', 'Jibannagar'
  ],
  'Jessore': [
    'Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Jessore Sadar',
    'Keshabpur', 'Manirampur', 'Sharsha'
  ],
  'Jhenaidah': [
    'Harinakunda', 'Jhenaidah Sadar', 'Kaliganj', 'Kotchandpur', 
    'Maheshpur', 'Shailkupa'
  ],
  'Kushtia': [
    'Bheramara', 'Daulatpur', 'Khoksa', 'Kumarkhali', 'Kushtia Sadar', 'Mirpur'
  ],
  'Magura': [
    'Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'
  ],
  'Meherpur': [
    'Gangni', 'Meherpur Sadar', 'Mujibnagar'
  ],
  'Narail': [
    'Kalia', 'Lohagara', 'Narail Sadar'
  ],
  'Satkhira': [
    'Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Satkhira Sadar',
    'Shyamnagar', 'Tala'
  ],

  // Barisal Division
  'Barisal': [
    'Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara', 'Barisal Sadar',
    'Gaurnadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur'
  ],
  'Barguna': [
    'Amtali', 'Bamna', 'Barguna Sadar', 'Betagi', 'Patharghata', 'Taltali'
  ],
  'Bhola': [
    'Bhola Sadar', 'Burhanuddin', 'Char Fasson', 'Daulatkhan', 
    'Lalmohan', 'Manpura', 'Tazumuddin'
  ],
  'Jhalokati': [
    'Jhalokati Sadar', 'Kathalia', 'Nalchity', 'Rajapur'
  ],
  'Patuakhali': [
    'Bauphal', 'Dashmina', 'Dumki', 'Galachipa', 'Kalapara',
    'Mirzaganj', 'Patuakhali Sadar', 'Rangabali'
  ],
  'Pirojpur': [
    'Bhandaria', 'Kawkhali', 'Mathbaria', 'Nazirpur', 'Nesarabad', 
    'Pirojpur Sadar', 'Zianagar'
  ],

  // Sylhet Division
  'Sylhet': [
    'Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj', 'Dakshin Surma',
    'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat',
    'Osmaninagar', 'Sylhet Sadar', 'Zakiganj'
  ],
  'Habiganj': [
    'Ajmiriganj', 'Bahubal', 'Baniachang', 'Chunarughat', 'Habiganj Sadar',
    'Lakhai', 'Madhabpur', 'Nabiganj', 'Sayestaganj'
  ],
  'Moulvibazar': [
    'Barlekha', 'Juri', 'Kamalganj', 'Kulaura', 'Moulvibazar Sadar',
    'Rajnagar', 'Sreemangal'
  ],
  'Sunamganj': [
    'Bishwambarpur', 'Chhatak', 'Dakshin Sunamganj', 'Derai', 'Dharampasha',
    'Dowarabazar', 'Jagannathpur', 'Jamalganj', 'Shalla', 'Sunamganj Sadar', 'Tahirpur'
  ],

  // Rangpur Division
  'Rangpur': [
    'Badarganj', 'Gangachara', 'Kaunia', 'Mithapukur', 'Pirgachha',
    'Pirganj', 'Rangpur Sadar', 'Taraganj'
  ],
  'Dinajpur': [
    'Birampur', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar',
    'Dinajpur Sadar', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama',
    'Nawabganj', 'Parbatipur', 'Phulbari'
  ],
  'Gaibandha': [
    'Fulchhari', 'Gaibandha Sadar', 'Gobindaganj', 'Palashbari', 
    'Sadullapur', 'Saghata', 'Sundarganj'
  ],
  'Kurigram': [
    'Bhurungamari', 'Char Rajibpur', 'Chilmari', 'Kurigram Sadar',
    'Nageshwari', 'Phulbari', 'Rajarhat', 'Raumari', 'Ulipur'
  ],
  'Lalmonirhat': [
    'Aditmari', 'Hatibandha', 'Kaliganj', 'Lalmonirhat Sadar', 'Patgram'
  ],
  'Nilphamari': [
    'Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj', 'Nilphamari Sadar', 'Saidpur'
  ],
  'Panchagarh': [
    'Atwari', 'Boda', 'Debiganj', 'Panchagarh Sadar', 'Tetulia'
  ],
  'Thakurgaon': [
    'Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail', 'Thakurgaon Sadar'
  ],

  // Mymensingh Division
  'Mymensingh': [
    'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 'Gauripur',
    'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Mymensingh Sadar', 
    'Nandail', 'Phulpur', 'Trishal', 'Tarakanda'
  ],
  'Jamalpur': [
    'Bakshiganj', 'Dewanganj', 'Islampur', 'Jamalpur Sadar', 
    'Madarganj', 'Melandaha', 'Sarishabari'
  ],
  'Netrokona': [
    'Atpara', 'Barhatta', 'Durgapur', 'Kalmakanda', 'Kendua',
    'Khaliajuri', 'Madan', 'Mohanganj', 'Netrokona Sadar', 'Purbadhala'
  ],
  'Sherpur': [
    'Jhenaigati', 'Nakla', 'Nalitabari', 'Sherpur Sadar', 'Sreebardi'
  ]
};

// Helper function to get districts for a division
export const getDistricts = (division: string): string[] => {
  return DISTRICTS_BY_DIVISION[division] || [];
};

// Helper function to get upazilas for a district
export const getUpazilas = (district: string): string[] => {
  return UPAZILAS_BY_DISTRICT[district] || [];
};

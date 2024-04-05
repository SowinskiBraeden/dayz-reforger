const { calculateVector } = require('../util/Vector');

module.exports = {
	// Calculates the nearest location to a given coordinate
	nearest: (pos, mission) => {
		let tempDest;
    let lastDist = 1000000;
    let destination_dir;
    for (let i = 0; i < destinations[mission].length; i++) {
      let { distance, theta, dir } = calculateVector(data.pos, destinations[mission][i].coord);
      if (distance < lastDist) {
        tempDest = destinations[mission][i].name;
        lastDist = distance;
        destination_dir = dir;
      }
    }
    return lastDist > 500 ? `${destination_dir} of ${tempDest}` : `Near ${tempDest}`;
	}
}

// A curated list of destinations across DayZ Chernarus and Livonia
const destinations = {
	Chernarus: [
		{
			name: 'Sinystok',
			coord: [1481.47, 11933.38],
		}, {
			name: 'Novaya Petrovka',
			coord: [3437.31, 13010.46],		
		}, {
			name: 'Zaprundoe',
			coord: [5171.52, 12753.83],		
		}, {
			name: 'Ratnoe',
			coord: [6174.72, 12722.72],		
		}, {
			name: 'Severograd',
			coord: [7986.69, 12699.39],		
		}, {
			name: 'Svergino',
			coord: [9464.27, 13718.14],		
		}, {
			name: 'West Novodmitrovsk',
			coord: [10988.51, 14344.17],		
		}, {
			name: 'East Novodmitrovsk',
			coord: [12143.35, 14336.39],		
		}, {
			name: 'North Novodmitrovsk',
			coord: [11544.55, 14764.11],		
		}, {
			name: 'Cernaya Polyana',
			coord: [12112.25, 13760.91],		
		}, {
			name: 'Turovo',
			coord: [13585.94, 14060.32],		
		}, {
			name: 'Karmanovka',
			coord: [12679.95, 14678.56],		
		}, {
			name: 'Dobroe',
			coord: [12956.02, 15051.85],		
		}, {
			name: 'Belaya Polyana',
			coord: [14161.41, 14942.97],		
		}, {
			name: 'Svetlojarsk',
			coord: [14001.99, 13251.54],		
		}, {
			name: 'Olsha',
			coord: [13348.75, 12897.70],		
		}, {
			name: 'Black Lake',
			coord: [13438.18, 12127.80],		
		}, {
			name: 'Krasno Airfield',
			coord: [12018.93, 12586.63],		
		}, {
			name: 'Krasnostav',
			coord: [11163.49, 12248.34],		
		}, {
			name: 'Rify',
			coord: [13811.46, 11210.15],		
		}, {
			name: 'Khelmn',
			coord: [12287.22, 10840.75],		
		}, {
			name: 'North Berezino',
			coord: [12905.47, 10059.19],		
		}, {
			name: 'Central Berezino',
			coord: [12423.31, 9600.36],		
		}, {
			name: 'South Berezino',
			coord: [11968.38, 9079.32],		
		}, {
			name: 'Dubrovka',
			coord: [10362.48, 9837.55],		
		}, {
			name: 'Vyshnaya Dubrovka',
			coord: [9891.99, 10432.47],		
		}, {
			name: 'North Solnichniy',
			coord: [13123.22, 7100.15]
		}, {
			name: 'Solnichniy',
			coord: [13418.74, 6248.60],		
		}, {
			name: 'Orlovets',
			coord: [12201.68, 7275.12],		
		}, {
			name: 'Polana',
			coord: [10743.54, 8134.45],		
		}, {
			name: 'Gorka',
			coord: [9487.60, 8811.03],		
		}, {
			name: 'Radio Zenit',
			coord: [8128.62, 9230.97],		
		}, {
			name: 'Dolina',
			coord: [11276.25, 6594.66],		
		}, {
			name: 'Devil\'s Castle',
			coord: [6890.18, 11439.56],		
		}, {
			name: 'Zolotar Castle (Black Mountain)',
			coord: [10189.45, 12038.37],		
		}, {
			name: 'Kamensk',
			coord: [6684.09, 14410.27],		
		}, {
			name: 'MB Kamensk',
			coord: [7862.27, 14698.01],		
		}, {
			name: 'Quarry',
			coord: [8614.66, 13333.19],		
		}, {
			name: 'Nagornoe',
			coord: [9262.08, 14620.24],		
		}, {
			name: 'Stary Yar',
			coord: [4965.44, 15028.52],		
		}, {
			name: 'Tisy',
			coord: [3425.65, 14783.55],		
		}, {
			name: 'MB Tisy',
			coord: [1543.68, 14052.54],		
		}, {
			name: 'Topolniki',
			coord: [2834.62, 12388.32],		
		}, {
			name: 'North NWAF',
			coord: [4024.45, 11738.96],		
		}, {
			name: 'Central NWAF',
			coord: [4249.98, 10766.87],		
		}, {
			name: 'South NWAF',
			coord: [4864.34, 9588.70],		
		}, {
			name: 'Grishino',
			coord: [5976.41, 10300.27],		
		}, {
			name: 'Kabanino',
			coord: [5284.28, 8604.94],		
		}, {
			name: 'Stary Sobor',
			coord: [6058.07, 7792.28],		
		}, {
			name: 'Novy Sobor',
			coord: [7088.48, 7648.41],		
		}, {
			name: 'MB VMC',
			coord: [4483.28, 8286.10],		
		}, {
			name: 'Vybor',
			coord: [3814.48, 8904.35],		
		}, {
			name: 'Pustoshka',
			coord: [3060.14, 7905.04],		
		}, {
			name: 'Lopatino',
			coord: [2725.74, 10016.42],		
		}, {
			name: 'Vavilovo',
			coord: [2228.03, 11039.06],		
		}, {
			name: 'Kalinka',
			coord: [3301.22, 11249.03],		
		}, {
			name: 'Biathlon Arena',
			coord: [493.82, 11093.50],		
		}, {
			name: 'Krona Castle',
			coord: [1395.92, 9246.52],		
		}, {
			name: 'Myshkino',
			coord: [2010.28, 7317.90],		
		}, {
			name: 'Polesovo',
			coord: [5929.75, 13523.72],		
		}, {
			name: 'Kalinovka',
			coord: [7516.20, 13457.62],		
		}, {
			name: 'Skalisty Island',
			coord: [13620.93, 3040.70],		
		}, {
			name: 'Kamyshovo',
			coord: [12061.70, 3526.74],		
		}, {
			name: 'Elektrozavodsk',
			coord: [10273.05, 2010.28],		
		}, {
			name: 'Cherno. Prigorodki',
			coord: [7733.95, 3182.62],		
		}, {
			name: 'Chernogorsk',
			coord: [6573.28, 2544.93],		
		}, {
			name: 'Cherno. Dubovo',
			coord: [6672.43, 3616.18],		
		}, {
			name: 'Cherno. Vysotovo',
			coord: [5686.73, 2552.71],		
		}, {
			name: 'Cherno. Novoselki',
			coord: [6139.72, 3239.01],		
		}, {
			name: 'Balota Airfield',
			coord: [5054.87, 2344.68],		
		}, {
			name: 'Balota',
			coord: [4463.84, 2441.89],		
		}, {
			name: 'Komarovo',
			coord: [3670.61, 2457.44],		
		}, {
			name: 'Prison Island',
			coord: [2702.41, 1296.77],		
		}, {
			name: 'Kamenka',
			coord: [1905.30, 2231.92],		
		}, {
			name: 'MB Pavlovo',
			coord: [2130.82, 3363.43],		
		}, {
			name: 'Pavlovo',
			coord: [1675.88, 3845.59],		
		}, {
			name: 'Bor',
			coord: [3324.55, 3985.57],		
		}, {
			name: 'Nadezhdino',
			coord: [5867.54, 4790.46],		
		}, {
			name: 'Mogilevka',
			coord: [7570.64, 5140.41],		
		}, {
			name: 'Pusta',
			coord: [9192.09, 3861.14],		
		}, {
			name: 'Staroye',
			coord: [10136.96, 5443.71],		
		}, {
			name: 'MSTA',
			coord: [11334.57, 5486.48],		
		}, {
			name: 'Tulga',
			coord: [12753.83, 4405.51],		
		}, {
			name: 'Guglovo',
			coord: [8437.74, 6680.21],		
		}, {
			name: 'Vyshnoye',
			coord: [6586.88, 6054.18],		
		}, {
			name: 'Rogovo',
			coord: [4763.24, 6765.75],		
		}, {
			name: 'Pulkovo',
			coord: [4969.33, 5614.79],		
		}, {
			name: 'Green Mountain',
			coord: [3707.55, 6003.63],		
		}, {
			name: 'Zelenogorsk',
			coord: [2581.87, 5190.96],		
		}, {
			name: 'Sosnovka',
			coord: [2527.43, 6369.14],		
		}, {
			name: 'Plotina Tishina Damn',
			coord: [1193.73, 6363.30],		
		}, {
			name: 'Zvir',
			coord: [571.59, 5294.00],		
		}, {
			name: 'Shakhovka',
			coord: [9658.69, 6555.78],		
		}, {
			name: 'Black Forrest',
			coord: [9021.00, 7792.28],		
		}, {
			name: 'Nizhneye',
			coord: [12971.57, 8142.23],		
		}, {
			name: 'Rog Castle',
			coord: [11249.03, 4281.09],
		}, {
			name: 'Krasnoe',
			coord: [6400.24, 15012.96],
		}, {
			name: 'Zub Castle',
			coord: [6538.28, 5595.35],
		}, {
			name: 'Pogorevka',
			coord: [4417.18, 6400.24],
		}, {
			name: 'Kozlovka',
			coord: [4389.96, 4693.25],
		}, {
			name: 'Logging Yard',
			coord: [940.98, 7660.07],
		}, {
			name: 'Zabolotye',
			coord: [1193.73, 10020.31],
		}, {
			name: 'Ski Resort Peak',
			coord: [250.80, 11867.28],
		},
	],
	Livonia: [
		{
			name: 'Lukow',
			coord: [3575.00 / 11925.00],
		}, {
			name: 'Brena',
			coord: [6518.75 / 11228.13],
		}, {
			name: 'Kolembrody',
			coord: [8406.25 / 11968.75],
		}, {
			name: 'Grabin',
			coord: [10756.25 / 11062.50],
		}, {
			name: 'Sitnik',
			coord: [11440.63 / 9543.75],
		}, {
			name: 'Tarnow',
			coord: [9275.00 / 10921.88],
		}, {
			name: 'Sobatka',
			coord: [6250.00 / 10193.75],
		}, {
			name: 'Gliniska',
			coord: [5012.50 / 9881.25],
		}, {
			name: 'Gliniska Airfield',
			coord: [3968.75 / 10278.13]
		}, {
			name: 'Kopa',
			coord: [5545.31 / 8748.44],
		}, {
			name: 'Olszanka',
			coord: [4856.25 / 7571.88],
		}, {
			name: 'Radacz',
			coord: [4006.25 / 7972.66],
		}, {
			name: 'Topolin',
			coord: [1665.62 / 7378.13],
		}, {
			name: 'Bielawa',
			coord: [1525.00 / 9700.00],
		}, {
			name: 'Adamow',
			coord: [3081.25 / 6793.75],
		}, {
			name: 'Muratyn',
			coord: [4587.50 / 6387.50],
		}, {
			name: 'Lipina',
			coord: [5943.75 / 6787.50],
		}, {
			name: 'Nidek',
			coord: [6118.75 / 8056.25],
		}, {
			name: 'Zapadlisko',
			coord: [8093.75 / 8710.94],
		}, {
			name: 'Krsnik Military',
			coord: [7841.02 / 10075.39],
		}, {
			name: 'Zalesie',
			coord: [878.12 / 5512.50],
		}, {
			name: 'Borek Military',
			coord: [9807.81 / 8500.00],
		}, {
			name: 'Polkrabiec',
			coord: [11878.13 / 6571.09],
		}, {
			name: 'Lembork',
			coord: [8825.00 / 6628.13],
		}, {
			name: 'Karlin',
			coord: [10064.39 / 6924.93],
		}, {
			name: 'Radunin',
			coord: [7301.89 / 6418.68],
		}, {
			name: 'Roztoka',
			coord: [7650.00 / 5246.88],
		}, {
			name: 'Sarnowek',
			coord: [3287.50 / 5009.38],
		}, {
			name: 'Huta',
			coord: [5154.69 / 5520.31],
		}, {
			name: 'Drewniki',
			coord: [5834.38 / 5084.38],
		}, {
			name: 'Nadbor',
			coord: [6056.25 / 4103.13],
		}, {
			name: 'Nadbor Military',
			coord: [5625.00 / 3787.50],
		}, {
			name: 'Max',
			coord: [6448.44 / 4732.81],
		}, {
			name: 'Wrzeszcz',
			coord: [9042.19 / 4385.94],
		}, {
			name: 'Gieraltow',
			coord: [11243.75 / 4332.81],
		}, {
			name: 'Konopki',
			coord: [11460.16 / 2889.84],
		}, {
			name: 'Swarog Military',
			coord: [5017.19 / 2146.88],
		}, {
			name: 'Hedrykow',
			coord: [4487.50 / 4825.00],
		}, {
			name: 'Polana',
			coord: [3296.87 / 2043.75],
		}, {
			name: 'Dambog',
			coord: [597.27 / 1138.67],
		}, {
			name: 'Dolnik',
			coord: [11410.94 / 578.12],
		}, {
			name: 'Widok',
			coord: [10234.38 / 2165.63],
		},
	]
}
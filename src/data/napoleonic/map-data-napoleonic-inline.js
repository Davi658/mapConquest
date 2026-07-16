window.MC_NationsData_Napoleonic = {
    "era": "napoleonic",
    "eraName": "Era Napoleônica",
    "eraYear": "1800 d.C.",
    "description": "Napoleão Bonaparte remodela a Europa. O Império Francês avança por todo o continente enquanto as grandes potências se unem para resistir à sua hegemonia.",

    "nations": {
        "france": {
            "name": "França Napoleônica",
            "fullName": "Empire Français (Primeiro Império)",
            "color": "#1976d2", // Royal Blue
            "capital": "Paris",
            "flag": "🇫🇷",
            "continent": "europe",
            "gdp": 22000,
            "militaryStrength": 98
        },
        "britain": {
            "name": "Império Britânico",
            "fullName": "United Kingdom of Great Britain",
            "color": "#c62828", // British Red
            "capital": "Londres",
            "flag": "🇬🇧",
            "continent": "europe",
            "gdp": 26000,
            "militaryStrength": 95
        },
        "russia": {
            "name": "Império Russo",
            "fullName": "Российская Империя",
            "color": "#d4af37", // Golden/Yellow-olive
            "capital": "São Petersburgo",
            "flag": "🇷🇺",
            "continent": "europe",
            "gdp": 18000,
            "militaryStrength": 90
        },
        "spain": {
            "name": "Espanha e Colônias",
            "fullName": "Imperio Español",
            "color": "#e5c158", // Spanish Yellow
            "capital": "Madri",
            "flag": "🇪🇸",
            "continent": "europe",
            "gdp": 14000,
            "militaryStrength": 78
        },
        "ottoman": {
            "name": "Império Otomano",
            "fullName": "Devlet-i Aliyye-i Osmaniyye",
            "color": "#5c6bc0", // Blue-violet/Indigo
            "capital": "Constantinopla",
            "flag": "🌙",
            "continent": "middle_east",
            "gdp": 12000,
            "militaryStrength": 80
        },
        "qing": {
            "name": "Dinastia Qing",
            "fullName": "大清帝國 (Dà Qīng Dìguó)",
            "color": "#81c784", // Light Green
            "capital": "Pequim",
            "flag": "🐉",
            "continent": "east_asia",
            "gdp": 20000,
            "militaryStrength": 82
        },
        "prussia": {
            "name": "Prússia",
            "fullName": "Königreich Preußen",
            "color": "#b39ddb", // Light Purple/Lavender
            "capital": "Berlim",
            "flag": "🦅",
            "continent": "europe",
            "gdp": 9000,
            "militaryStrength": 88
        },
        "portugal": {
            "name": "Reino de Portugal",
            "fullName": "Reino de Portugal e do Brasil",
            "color": "#ec4899", // Portuguese Pink
            "capital": "Lisboa",
            "flag": "🇵🇹",
            "continent": "europe",
            "gdp": 5000,
            "militaryStrength": 65
        },
        "usa": {
            "name": "Estados Unidos",
            "fullName": "Estados Unidos da América",
            "color": "#4299e1", // Blue (same shade as France/custom blue)
            "capital": "Washington D.C.",
            "flag": "🇺🇸",
            "continent": "americas",
            "gdp": 6000,
            "militaryStrength": 50
        },
        "dinamark": {
            "name": "Dinamarca",
            "fullName": "Reino da Dinamarca e Suécia",
            "color": "#f472b6", // Sweden Pink
            "capital": "Estocolmo",
            "flag": "🇸🇪",
            "continent": "europe",
            "gdp": 4500,
            "militaryStrength": 70
        },
        "neutral": {
            "name": "Independente",
            "fullName": "Nações e Territórios Independentes",
            "color": "#eceff1", // Off-white/Light Gray
            "capital": "-",
            "flag": "🏳️",
            "continent": null,
            "gdp": 0,
            "militaryStrength": 30
        }
    },

    "regions": {
        "europe": "Europa",
        "americas": "Américas",
        "africa": "África",
        "middle_east": "Oriente Médio",
        "east_asia": "Ásia Oriental",
        "south_asia": "Sul da Ásia"
    },

    "countryFactionMap": {
        // França e satélites franceses
        "france": "france",
        "helvetic_republic": "france",
        "lombardy": "france",
        "venetia": "france",
        "tuscany": "france",
        "papal_states": "france",
        "parma": "france",
        "modena": "france",
        "lucca": "france",
        "kingdom_of_sardinia": "france",
        "kingdom_of_sardinia_2": "france",
        "kingdom_of_the_two_sicilies": "france",

        // Império Britânico e colônias
        "united_kingdom": "britain",
        "united_kingdom_2": "britain",
        "kingdom_of_ireland": "britain",
        "cape_colony": "britain",
        "british_guiana": "britain",
        "ceylon_dutch": "britain",
        "hong_kong": "britain",
        "malaya": "britain",
        "madras": "britain",
        "malabar": "britain",
        "circars": "britain",
        "carnatic": "britain",
        "quebec": "britain",
        "acadian_peninsula_uk": "britain",
        "rupert_s_land": "britain",
        "t_atsaot_ine": "britain",
        "feature_147": "britain",
        "bahamas": "britain",
        "feature_165": "britain",
        "feature_166": "britain",
        "feature_167": "britain",
        "feature_168": "britain",
        "feature_169": "britain",
        "feature_170": "britain",
        "feature_171": "britain",
        "feature_172": "britain",
        "feature_173": "britain",
        "feature_174": "britain",
        "feature_175": "britain",
        "feature_176": "britain",
        "feature_177": "britain",
        "feature_178": "britain",
        "feature_179": "britain",
        "feature_180": "britain",
        "feature_181": "britain",

        // Império Russo
        "russian_empire": "russia",
        "finland": "russia",
        "kuril_islands": "russia",
        "finnmark": "russia",
        "suspiaq": "russia",
        "eyaq": "russia",
        "feature_128": "russia",

        // Espanha e colônias
        "spain": "spain",
        "florida": "spain",
        "vice_royalty_of_new_spain": "spain",
        "vice_royalty_of_new_granada": "spain",
        "vice_royalty_of_peru": "spain",
        "viceroyalty_of_the_rio_de_la_plata": "spain",
        "philippines": "spain",
        "guanches": "spain",
        "captaincy_general_of_cuba":"spain",

        // Prússia e estados alemães aliados
        "prussia": "prussia",
        "prussia_2": "prussia",
        "saxony": "prussia",
        "hanover": "prussia",
        "brunswick": "prussia",
        "brunswick_2": "prussia",
        "mecklenburg_schwerin": "prussia",
        "mecklenburg_strelitz": "prussia",
        "wurttemberg": "prussia",
        "thuringia": "prussia",
        "thuringia_2": "prussia",
        "thuringia_3": "prussia",
        "swabia": "prussia",
        "oldenburg": "prussia",
        "oldenburg_2": "prussia",
        "hohenzollern": "prussia",
        "lippe_detmold": "prussia",
        "schaumburg_lippe": "prussia",
        "waldeck": "prussia",

        // Império Otomano
        "ottoman_empire": "ottoman",
        "tripolitania": "ottoman",
        "cyrenaica": "ottoman",
        "tunis": "ottoman",
        "morocco": "ottoman",
        "oman": "ottoman",
        "yemen": "ottoman",
        "nejd": "ottoman",

        // Qing / China
        "qing_empire": "qing",
        "korea": "qing",
        "tibet": "qing",

        // Outros independentes notáveis
        "sweden": "sweden",
        "denmark_norway": "sweden", // Denmark-Norway has the same pink color/alignment in the 1800 map
        "portugal": "portugal",
        "persia": "neutral",
        "japan": "neutral",
        "nepal": "neutral",
        "maratha_confederacy": "neutral",
        "siam": "neutral",
        "united_states_of_america": "usa",
        "luisiana": "usa",
        "vice_royalty_of_brazil": "portugal"
    },

    "puppets": {
        "helvetic_republic": "França (Estado Satélite)",
        "lombardy": "França (Estado Satélite)",
        "venetia": "França (Estado Satélite)",
        "tuscany": "França (Estado Satélite)",
        "papal_states": "França (Estado Satélite)",
        "parma": "França (Estado Satélite)",
        "modena": "França (Estado Satélite)",
        "lucca": "França (Estado Satélite)",
        "kingdom_of_sardinia": "França (Estado Satélite)",
        "kingdom_of_sardinia_2": "França (Estado Satélite)",
        "kingdom_of_the_two_sicilies": "França (Estado Satélite)",
        "vice_royalty_of_brazil": "Portugal (Vice-Reino do Brasil)",
        "vice_royalty_of_new_spain": "Espanha (Vice-Reino da Nova Espanha)",
        "vice_royalty_of_new_granada": "Espanha (Vice-Reino de Nova Granada)",
        "vice_royalty_of_peru": "Espanha (Vice-Reino do Peru)",
        "viceroyalty_of_the_rio_de_la_plata": "Espanha (Vice-Reino do Rio da Prata)",
        "philippines": "Espanha (Colônia)",
        "florida": "Espanha (Colônia da Flórida)",
        "luisiana": "Estados Unidos (Território da Luisiana)",
        "quebec": "Reino Unido (Colônia do Baixo Canadá)",
        "acadian_peninsula_uk": "Reino Unido (Colônia da Acádia/Nova Escócia)",
        "rupert_s_land": "Reino Unido (Hudson's Bay Company - Território Privado)",
        "t_atsaot_ine": "Reino Unido (Território do Noroeste)",
        "bahamas": "Reino Unido (Colônia)",
        "feature_165": "Reino Unido (Território Ártico)",
        "feature_166": "Reino Unido (Território Ártico)",
        "feature_167": "Reino Unido (Território Ártico)",
        "feature_168": "Reino Unido (Território Ártico)",
        "feature_169": "Reino Unido (Território Ártico)",
        "feature_170": "Reino Unido (Território Ártico)",
        "feature_171": "Reino Unido (Território Ártico)",
        "feature_172": "Reino Unido (Território Ártico)",
        "feature_173": "Reino Unido (Território Ártico)",
        "feature_174": "Reino Unido (Território Ártico)",
        "feature_175": "Reino Unido (Território Ártico)",
        "feature_176": "Reino Unido (Território Ártico)",
        "feature_177": "Reino Unido (Território Ártico)",
        "feature_178": "Reino Unido (Território Ártico)",
        "feature_179": "Reino Unido (Território Ártico)",
        "feature_180": "Reino Unido (Território Ártico)",
        "feature_181": "Reino Unido (Território Ártico)",
        "inupiaq": "Inupiaq (Tribos Independentes)",
        "suspiaq": "Rússia (Companhia do Alasca)",
        "eyaq": "Rússia (Companhia do Alasca)",
        "feature_128": "Rússia (Companhia do Alasca)",
        "feature_147": "Esquimós (Atabascanos)"
    }
};

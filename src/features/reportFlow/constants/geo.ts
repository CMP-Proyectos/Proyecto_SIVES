// src/features/reportFlow/constants/geo.ts

export const WGS84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";

export const utmZones: Record<string, string> = { 
    "17": "+proj=utm +zone=17 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs", 
    "18": "+proj=utm +zone=18 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs", 
    "19": "+proj=utm +zone=19 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs" 
};

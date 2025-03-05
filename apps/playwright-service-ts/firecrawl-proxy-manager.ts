// firecrawl-proxy-manager.ts

export const availableProxies: Record<string, string> = {
	// USA - 1088
	US: "192.168.150.80:1088",
	// Poland - 1688
	PL: "192.168.150.80:1688",
	// Canada - 2588
	CA: "192.168.150.80:1788",
	// Belarus - 3688
	BY: "192.168.150.80:3688",
	// GB - 2088
	GB: "192.168.150.80:2088",
	// Albania - 7588
	AL: "192.168.150.80:7588",
	// Isle of Man - 1188
	IM: "192.168.150.80:1188",
	// Georgia - 1788
	GE: "192.168.150.80:1788",
	// France - 2288
	FR: "192.168.150.80:2288",
	// Finland - 3188
	FI: "192.168.150.80:3188",
	// Germany - 1388
	DE: "192.168.150.80:1388",
	// Serbia - 3088
	RS: "192.168.150.80:3088",
	// Kazahstan - 6988
	KZ: "192.168.150.80:6988",
	// Japan - 2788
	JP: "192.168.150.80:2788",
	// Sweden - 2388
	SE: "192.168.150.80:2388",
	// Austria - 3888
	AT: "192.168.150.80:3888",
	// Andorra - 3388
	AD: "192.168.150.80:3388",
	// Slovenia - 2888
	SI: "192.168.150.80:2888",
	// Spain - 1888
	ES: "192.168.150.80:1888",
	// Italy - 3788
	IT: "192.168.150.80:3788",
	// Ukraine - 1588
	UA: "192.168.150.80:1588",
	// Australia - 3488
	AU: "192.168.150.80:3488",
	// Monaco - 3288
	MC: "192.168.150.80:3288",
	// Colombia - 1988
	CO: "192.168.150.80:1988",
	// Netherlands - 2688
	NL: "192.168.150.80:2688",
	// Singapore - 5488
	SG: "192.168.150.80:5488",
	// Liechtenstein - 2488
	LI: "192.168.150.80:2488",
	// Luxembourg - 2188
	LU: "192.168.150.80:2188",
	// Hong Kong - 1288
	HK: "192.168.150.80:1288",
};

export function getProxyForCountry(countryKey: string): string {
	return availableProxies[countryKey.toUpperCase()] || availableProxies.US;
}

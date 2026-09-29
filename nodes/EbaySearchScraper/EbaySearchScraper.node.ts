import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { OptionField } from './GenericFunctions';
import { applyOptions, requireString, runActorAndGetItems } from './GenericFunctions';

// ScrapeUnblocker's public "eBay Search Scraper" Actor: https://apify.com/scrapeunblocker/ebay-search-scraper
const ACTOR_ID = 'uJbJP1p6Y6n8Yfzto';
const INTEGRATION_APP_ID = 'scrapeunblocker-ebay-search-scraper';

// Node option name -> Actor input key.
const OPTION_FIELDS: Record<string, OptionField> = {
	marketplace: {
		key: 'marketplace',
	},
	condition: {
		key: 'condition',
	},
	listingType: {
		key: 'listing_type',
	},
	minPrice: {
		key: 'min_price',
	},
	maxPrice: {
		key: 'max_price',
	},
	freeShipping: {
		key: 'free_shipping',
	},
	seller: {
		key: 'seller',
	},
	category: {
		key: 'category',
	},
	sort: {
		key: 'sort',
	},
	pageSize: {
		key: 'page_size',
	},
	proxyCountry: {
		key: 'proxy_country',
		kind: 'upper',
	},
};

function buildActorInput(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	options: IDataObject,
	itemIndex: number,
): IDataObject {
	const input: IDataObject = {};

	switch (`${resource}:${operation}`) {
		case 'listing:search': {
			input.keyword = requireString.call(this, 'keyword', 'Search Query', itemIndex);
			input.max_results = this.getNodeParameter('maxResults', itemIndex);
			break;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "${resource}"`,
				{ itemIndex },
			);
	}

	applyOptions(input, options, OPTION_FIELDS);
	return input;
}

export class EbaySearchScraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'eBay Search Scraper',
		name: 'ebaySearchScraper',
		icon: {
			light: 'file:ebaySearchScraper.png',
			dark: 'file:ebaySearchScraper.dark.png',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search eBay listings on 19 regional marketplaces with the ScrapeUnblocker Actor on Apify',
		defaults: {
			name: 'eBay Search Scraper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'apifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Listing',
						value: 'listing',
					},
				],
				default: 'listing',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['listing'],
					},
				},
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search eBay listings by keyword',
						action: 'Search listings',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Search Query',
				name: 'keyword',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'iphone 13',
				description:
					"What to search for - a keyword, product name or part number (e.g. 'iphone 13' or '1K0953519A')",
				displayOptions: {
					show: {
						resource: ['listing'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 2000,
				},
				default: 100,
				description: 'How many listings to collect across pages (1-2000)',
				displayOptions: {
					show: {
						resource: ['listing'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Category ID',
						name: 'category',
						type: 'string',
						default: '',
						description: "The eBay category ID to search inside, e.g. '131090' for vehicle parts",
					},
					{
						displayName: 'Condition',
						name: 'condition',
						type: 'options',
						options: [
							{
								name: 'Any',
								value: '',
							},
							{
								name: 'For Parts / Not Working',
								value: 'for_parts',
							},
							{
								name: 'New',
								value: 'new',
							},
							{
								name: 'Open Box',
								value: 'open_box',
							},
							{
								name: 'Refurbished',
								value: 'refurbished',
							},
							{
								name: 'Used',
								value: 'used',
							},
						],
						default: '',
						description: 'Only listings in this condition. Leave blank for any.',
					},
					{
						displayName: 'Free Shipping Only',
						name: 'freeShipping',
						type: 'boolean',
						default: false,
						description: 'Whether to return only listings eBay marks as free delivery',
					},
					{
						displayName: 'Listing Type',
						name: 'listingType',
						type: 'options',
						options: [
							{
								name: 'All',
								value: 'all',
							},
							{
								name: 'Auction',
								value: 'auction',
							},
							{
								name: 'Buy It Now (Fixed Price)',
								value: 'buy_it_now',
							},
						],
						default: 'all',
						description: 'Auction, fixed-price (Buy It Now) or all',
					},
					{
						displayName: 'Marketplace',
						name: 'marketplace',
						type: 'options',
						options: [
							{
								name: 'Australia (ebay.com.au)',
								value: 'ebay.com.au',
							},
							{
								name: 'Austria (ebay.at)',
								value: 'ebay.at',
							},
							{
								name: 'Belgium (ebay.be)',
								value: 'ebay.be',
							},
							{
								name: 'Canada (ebay.ca)',
								value: 'ebay.ca',
							},
							{
								name: 'France (ebay.fr)',
								value: 'ebay.fr',
							},
							{
								name: 'Germany (ebay.de)',
								value: 'ebay.de',
							},
							{
								name: 'Hong Kong (ebay.com.hk)',
								value: 'ebay.com.hk',
							},
							{
								name: 'India (ebay.in)',
								value: 'ebay.in',
							},
							{
								name: 'Ireland (ebay.ie)',
								value: 'ebay.ie',
							},
							{
								name: 'Italy (ebay.it)',
								value: 'ebay.it',
							},
							{
								name: 'Malaysia (ebay.com.my)',
								value: 'ebay.com.my',
							},
							{
								name: 'Netherlands (ebay.nl)',
								value: 'ebay.nl',
							},
							{
								name: 'Philippines (ebay.ph)',
								value: 'ebay.ph',
							},
							{
								name: 'Poland (ebay.pl)',
								value: 'ebay.pl',
							},
							{
								name: 'Singapore (ebay.com.sg)',
								value: 'ebay.com.sg',
							},
							{
								name: 'Spain (ebay.es)',
								value: 'ebay.es',
							},
							{
								name: 'Switzerland (ebay.ch)',
								value: 'ebay.ch',
							},
							{
								name: 'United Kingdom (ebay.co.uk)',
								value: 'ebay.co.uk',
							},
							{
								name: 'United States (ebay.com)',
								value: 'ebay.com',
							},
						],
						default: 'ebay.com',
						description:
							'Which regional eBay site to search. Prices, currency and availability differ per marketplace.',
					},
					{
						displayName: 'Max Price',
						name: 'maxPrice',
						type: 'number',
						default: 0,
						description: "Highest price to include, in the marketplace's currency",
					},
					{
						displayName: 'Min Price',
						name: 'minPrice',
						type: 'number',
						default: 0,
						description:
							"Lowest price to include, in the marketplace's currency. 0 means no minimum.",
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						typeOptions: {
							minValue: 60,
							maxValue: 240,
						},
						default: 240,
						description:
							'Listings per page eBay returns (60, 120 or 240). Larger means fewer requests.',
					},
					{
						displayName: 'Proxy Country',
						name: 'proxyCountry',
						type: 'string',
						default: '',
						placeholder: 'US',
						description:
							'Exit-IP country (ISO-2, e.g. US). Defaults to an exit chosen for the marketplace.',
					},
					{
						displayName: 'Seller',
						name: 'seller',
						type: 'string',
						default: '',
						description: "Restrict to a single seller's username",
					},
					{
						displayName: 'Sort By',
						name: 'sort',
						type: 'options',
						options: [
							{
								name: 'Best Match',
								value: 'best_match',
							},
							{
								name: 'Ending Soonest',
								value: 'ending_soon',
							},
							{
								name: 'Newly Listed',
								value: 'newly_listed',
							},
							{
								name: 'Price + Shipping: Highest First',
								value: 'price_desc',
							},
							{
								name: 'Price + Shipping: Lowest First',
								value: 'price_asc',
							},
						],
						default: 'best_match',
						description: 'Result ordering',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Maximum run time of the Apify Actor run. 0 keeps the Actor default. A run that times out fails the node.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const { timeout, ...actorOptions } = options;

				const input = buildActorInput.call(this, resource, operation, actorOptions, i);
				const { items: results } = await runActorAndGetItems.call(this, {
					actorId: ACTOR_ID,
					integrationAppId: INTEGRATION_APP_ID,
					input,
					itemIndex: i,
					timeoutSecs: (timeout as number) || undefined,
				});

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Both constructors return an error of their own class unchanged.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

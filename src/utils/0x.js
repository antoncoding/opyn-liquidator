import { assetDataUtils } from '@0x/order-utils';
import BigNumber from 'bignumber.js';
import { WETH } from '../constants/contracts';

import { toTokenUnitsBN } from './number';

const Promise = require('bluebird');

const endpoint = 'https://api.0x.org/';

/**
 * get orderbook: BASE:QUOTE
 * @param {string} base
 * @param {string} quote
 * @return {Promise<{
  bids: {total: number, page: number, perPage: number, records: {
    order: {
      signature: string,
      senderAddress: string,
      makerAddress: string,
      takerAddress: string,
      makerFee: string,
      takerFee: string,
      makerAssetAmount: string,
      takerAssetAmount: string,
      makerAssetData: string,
      takerAssetData: string,
      salt: string,
      exchangeAddress: string,
      feeRecipientAddress: string,
      expirationTimeSeconds: string,
      makerFeeAssetData: string,
      chainId: number,
      takerFeeAssetData: string
    },
    metaData: {
      orderHash: string,
      remainingFillableTakerAssetAmount: string
    }
  }[]},
  asks: {total: number, page: number, perPage: number, records: {
    order: {
      signature: string,
      senderAddress: string,
      makerAddress: string,
      takerAddress: string,
      makerFee: string,
      takerFee: string,
      makerAssetAmount: string,
      takerAssetAmount: string,
      makerAssetData: string,
      takerAssetData: string,
      salt: string,
      exchangeAddress: string,
      feeRecipientAddress: string,
      expirationTimeSeconds: string,
      makerFeeAssetData: string,
      chainId: number,
      takerFeeAssetData: string
    },
    metaData: {
      orderHash: string,
      remainingFillableTakerAssetAmount: string
    }
  }[]}
}>}
 */
export async function getOrderBook(base, quote) {
  const baseAsset = assetDataUtils.encodeERC20AssetData(base);
  const quoteAsset = assetDataUtils.encodeERC20AssetData(quote);
  return request(`sra/v3/orderbook?baseAssetData=${baseAsset}&quoteAssetData=${quoteAsset}&perPage=${100}`);
}

/**
 * get oToken:WETH stats (v1) for all options
 * @param {Array<{addr:string, decimals:number}>} options
 * @return {Promise<Arrya< option: address, bestAskPrice: BigNumber, bestAskPrice:BigNumber, bestAsk:{}, bestBid:{} >>}
 */
export async function getBasePairAskAndBids(options) {
  const bestAskAndBids = await Promise.map(options, async ({ addr: option, decimals }) => {
    const { asks, bids } = await getOrderBook(option, WETH);
    let bestAskPrice = 0;
    let bestBidPrice = 0;
    let bestAsk; let bestBid;
    if (asks.records.length > 0) {
      const validAsks = asks.records.filter((record) => isValid(record, decimals));
      const { makerAssetAmount: askTokenAmt, takerAssetAmount: askWETHAmt } = validAsks[0].order;
      bestAskPrice = toTokenUnitsBN(askWETHAmt, 18).div(toTokenUnitsBN(askTokenAmt, decimals));
      bestAsk = validAsks[0];
    }
    if (bids.records.length > 0) {
      const validBids = bids.records.filter((record) => isValid(record, decimals));
      const { makerAssetAmount: bidWETHAmt, takerAssetAmount: bidTokenAmt } = validBids[0].order;
      bestBidPrice = toTokenUnitsBN(bidWETHAmt, 18).div(toTokenUnitsBN(bidTokenAmt, decimals));
      bestBid = validBids[0];
    }

    return {
      option, bestAskPrice, bestBidPrice, bestAsk, bestBid,
    };
  });
  return bestAskAndBids;
}

/**
 *
 * @param {string} path
 */
async function request(path) {
  const res = await fetch(`${endpoint}${path}`);
  return res.json();
}

export function connectWebSocket(_orders, setBuyOrders) {
  const socket = new WebSocket('wss://api.0x.org/sra/v3');
  socket.onopen = () => {
    // console.log(`socket open ${e}`);
    socket.send(JSON.stringify({
      type: 'subscribe',
      channel: 'orders',
      requestId: '123e4567-e89b-12d3-a456-426655440000',
      makerAssetProxyId: '0xf47261b0',
      makerAssetData: '0x6b175474e89094c44da98b954eedeac495271d0f',
      takerAssetProxyId: '0xf47261b0',
      takerAssetData: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    }));
  };
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const entry = data.payload[0];

    const newOrders = _orders.concat(entry);
    setBuyOrders(newOrders);
  };
}

/**
 *
 * @param {*} entry
 * @param {*} decimals
 */
export const isValid = (entry) => {
  const notExpired = parseInt(entry.order.expirationTimeSeconds, 10) > Date.now() / 1000;
  // notDust: not very good
  const notDust = true; // new BigNumber(entry.metaData.remainingFillableTakerAssetAmount)
  //   .gt(new BigNumber(0.0001).times(new BigNumber(10).pow(takerAssetDecimals)));
  return notExpired && notDust;
};

/**
 * Create Order Object
 * @param {string} maker
 * @param {string} makerAsset Bid: quoteAsset, Ask: baseAsset
 * @param {string} takerAsset Bid: baseAsset, Ask: quoteAsset
 * @param {BigNumber} makerAssetAmount
 * @param {BigNumber} takerAssetAmount
 * @param {number} expiry
 */
export const createOrder = (maker, makerAsset, takerAsset, makerAssetAmount, takerAssetAmount, expiry) => {
  const salt = BigNumber.random(20).times(new BigNumber(10).pow(new BigNumber(20))).integerValue().toString(10);
  const order = {
    senderAddress: '0x0000000000000000000000000000000000000000',
    makerAddress: maker,
    takerAddress: '0x0000000000000000000000000000000000000000',
    makerFee: '0',
    takerFee: '0',
    makerAssetAmount: makerAssetAmount.toString(),
    takerAssetAmount: takerAssetAmount.toString(),
    makerAssetData: assetDataUtils.encodeERC20AssetData(makerAsset),
    takerAssetData: assetDataUtils.encodeERC20AssetData(takerAsset),
    salt,
    exchangeAddress: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
    feeRecipientAddress: '0x1000000000000000000000000000000000000011',
    expirationTimeSeconds: expiry.toString(), // 4/20
    makerFeeAssetData: '0x',
    chainId: 1,
    takerFeeAssetData: '0x',
  };
  return order;
};

export const broadcastOrders = async (orders) => {
  const url = `${endpoint}sra/v3/orders`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orders),
  });
  return res;
};

/**
 *
 * @param {{}} bid
 * @param {number} makerAssetDecimals WETH decimals
 * @param {number} takerAssetDecimals oTokenDecimals
 */
export const getBidPrice = (bid, makerAssetDecimals, takerAssetDecimals) => {
  const makerAssetAmount = toTokenUnitsBN(bid.order.makerAssetAmount, makerAssetDecimals);
  const takerAssetAmount = toTokenUnitsBN(bid.order.takerAssetAmount, takerAssetDecimals);
  return makerAssetAmount.div(takerAssetAmount);
};

/**
 * Calculate price of an ask order
 * @param {{}} ask
 * @param {number} makerAssetDecimals oToken Decimal
 * @param {number} takerAssetDecimals WETH decimals
 * @description maker want to sell oToken
 * takerAssetAmount 100 weth
 * makerAssetAmount 1 oToken
 */
export const getAskPrice = (ask, makerAssetDecimals, takerAssetDecimals) => {
  const makerAssetAmount = toTokenUnitsBN(ask.order.makerAssetAmount, makerAssetDecimals);
  const takerAssetAmount = toTokenUnitsBN(ask.order.takerAssetAmount, takerAssetDecimals);
  return takerAssetAmount.div(makerAssetAmount);
};
new BigNumber()
  .div(new BigNumber());

export const getOrderFillRatio = (order) => new BigNumber(100)
  .minus(new BigNumber(order.metaData.remainingFillableTakerAssetAmount)
    .div(new BigNumber(order.order.takerAssetAmount))
    .times(100)).toFixed(2);

/**
 *
 * @param {*} order
 * @return { {remainingTakerAssetAmount: BigNumber, remainingMakerAssetAmount: BigNumber} }
 */
export const getRemainingMakerAndTakerAmount = (order) => {
  const remainingTakerAssetAmount = new BigNumber(order.metaData.remainingFillableTakerAssetAmount);
  const makerAssetAmountBN = new BigNumber(order.order.makerAssetAmount);
  const takerAssetAmountBN = new BigNumber(order.order.takerAssetAmount);
  const remainingMakerAssetAmount = remainingTakerAssetAmount.multipliedBy(makerAssetAmountBN).div(takerAssetAmountBN);
  return { remainingTakerAssetAmount, remainingMakerAssetAmount };
};

/**
 *
 * @param {{}[]} orders
 * @return {{totalFillableTakerAmount: BigNumber,totalFillableMakerAmount:BigNumber}}
 */
export const getOrdersTotalFillables = (orders) => {
  const totalFillableTakerAmount = orders
    .map((order) => new BigNumber(order.metaData.remainingFillableTakerAssetAmount))
    .reduce((prev, next) => prev.plus(new BigNumber(next)), new BigNumber(0));

  const totalFillableMakerAmount = orders
    .map((order) => getRemainingMakerAndTakerAmount(order).remainingMakerAssetAmount)
    .reduce((prev, next) => prev.plus(new BigNumber(next)), new BigNumber(0));

  return { totalFillableTakerAmount, totalFillableMakerAmount };
};

/**
 * @return {Promise<{
 * fast:number, fastest:number, safeLow:number, average:number,
 * block_time:number, blockNum:number speed:number,
 * safeLowWait:number, avgWait:number, fastWait:number, fastestWait:number}>}
 */
export const getGasPrice = async () => {
  const url = 'https://ethgasstation.info/json/ethgasAPI.json';
  const res = await fetch(url);
  return res.json();
};
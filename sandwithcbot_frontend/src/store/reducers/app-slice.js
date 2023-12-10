import { ethers } from 'ethers';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { database } from '../../config/firebase';
import { erc20abi } from '../../utils/abis/erc20ABI';
import { addressDatabaseURL, historyDatabaseURL, RPC_URL } from '../../utils/basic';

async function getAll() {
  let tokens = [];
  const result = await database.ref(addressDatabaseURL + '/').get();
  
  if (result.exists) {
    const data = result.val();
    Object.keys(data).forEach((key, index) => {
      tokens.push({
        id: index + 1,
        key,
        ...data[key]
      })
    });
  };
  return tokens;
}

const initialState = {
  loading: "idle",
  tokens: [],
};

export const getAllTokens = createAsyncThunk(
  "app/getAllTokens",
  async () => {
    return await getAll();
  }
);

export const getAllTradeHistories = createAsyncThunk("app/getAllTradeHistories", async ()=> {

  let histories = [];
  const dbRef = database.ref(historyDatabaseURL + '/');
  const result = await dbRef.get();
  if (result.exists) {
    const data = result.val();
    Object.keys(data).forEach((key, index) => {
      histories.push({
        id: index + 1,
        key,
        ...data[key]
      })
    });
  };
 
  return histories;
})

export const addToken = createAsyncThunk(
  "app/addToken",
  async (address) => {
    const collections = await database.ref(addressDatabaseURL).get();
    if (collections.val() === null) {
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const tokenContract = new ethers.Contract(address, erc20abi, provider);
      const symbol = await tokenContract["symbol"]();
      const decimals = await tokenContract["decimals"]();
      const newToken = {
        address,
        symbol,
        decimals,
        active: true,
        minAmount: 0,
        maxAmount: 0,
        monitLimit: 0,
      };
      await database.ref(addressDatabaseURL).push().set(newToken);
    } else {
      const addresses = Object.values(collections.val()).map(collection => collection.address);
      if (!addresses.includes(address)) {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const tokenContract = new ethers.Contract(address, erc20abi, provider);
        const symbol = await tokenContract["symbol"]();
        const decimals = await tokenContract["decimals"]();

        const newToken = {
          address,
          symbol,
          decimals,
          active: true,
          minAmount: 0,
          maxAmount: 0,
          monitLimit: 0,
        };
        await database.ref(addressDatabaseURL).push().set(newToken);
      }
    }
    return await getAll();
  }
);

export const updateToken = createAsyncThunk(
  "app/updateToken",
  async (crypto) => {
    const tokenRef = database.ref(addressDatabaseURL + '/' + crypto.key);
    const token = await tokenRef.get();
    await tokenRef.update({ ...token.val(), ...crypto });
    const result = await getAll();
    return result;
  }
);

export const removeToken = createAsyncThunk(
  "app/removeToken",
  async (uuid) => {
    await database.ref(addressDatabaseURL + '/' + uuid).remove();
    return await getAll();
  }
);

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllTokens.pending, (state) => {
      state.loading = "pending";
    });
    builder.addCase(getAllTokens.fulfilled, (state, action) => {
      state.loading = "success";
      state.tokens = action.payload;
    });
    builder.addCase(getAllTokens.rejected, (state) => {
      state.loading = "failed";
    });
    builder.addCase(getAllTradeHistories.pending, (state) => {
      state.loading = "pending";
    });
    builder.addCase(getAllTradeHistories.fulfilled, (state, action) => {
      state.loading = "success";
      state.histories = action.payload;
    });
    builder.addCase(getAllTradeHistories.rejected, (state) => {
      state.loading = "failed";
    });
    builder.addCase(addToken.pending, (state) => {
      state.loading = "pending";
    });
    builder.addCase(addToken.fulfilled, (state, action) => {
      state.loading = "success";
      state.tokens = action.payload;
    });
    builder.addCase(addToken.rejected, (state) => {
      state.loading = "failed";
    });
    builder.addCase(updateToken.pending, (state) => {
      state.loading = "pending";
    });
    builder.addCase(updateToken.fulfilled, (state, action) => {
      state.loading = "success";
      state.tokens = action.payload;
    });
    builder.addCase(updateToken.rejected, (state) => {
      state.loading = "failed";
    });
    builder.addCase(removeToken.pending, (state) => {
      state.loading = "pending";
    });
    builder.addCase(removeToken.fulfilled, (state, action) => {
      state.loading = "success";
      state.tokens = action.payload;
    });
    builder.addCase(removeToken.rejected, (state) => {
      state.loading = "failed";
    });
  },
});

export const { increment, decrement, incrementByAmount } = appSlice.actions

export default appSlice.reducer;
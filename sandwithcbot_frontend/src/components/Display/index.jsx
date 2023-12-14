import { MDBDataTableV5 } from 'mdbreact';
import { BsClockHistory } from 'react-icons/bs';
import { GiReceiveMoney } from 'react-icons/gi';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, Modal, Card, Form } from 'react-bootstrap';

import { database } from '../../config/firebase';
import { historyDatabaseURL, pendingHistoryURL } from '../../utils/basic';


const Display = ({ socket }) => {
  const appData = useSelector(state => state.app);
  const [selectedLog, setSelectedLog] = useState({});
  const [detailShow, setDetailShow] = useState(false);
  const [isLogDialogFlog, setLogDialogFlog] = useState(false);
  const [tokenLists, setTokenLists] = useState([]);
  const [priceData, setPriceData] = useState([]);
  const [logData, setLogData] = useState([]);
  const [pendindData, setPendingData] = useState([]);
  const [executionState, setExecutionState] = useState(false);
  const [slippage, setSlippage] = useState('0.5');

  useEffect(() => {
    if (appData.loading === 'success') {
      const tokens = appData.tokens.filter(token => token.active);
      setTokenLists(tokens);
    }
  }, [appData.tokens]);

  useEffect(() => {
    if (appData.loading === 'success') {
      const histories = appData.histories;
      setLogData(histories);
      const dbRef = database.ref(historyDatabaseURL + '/');
      dbRef.on('child_changed', snap => {
        const data = snap.val();
        updateHistoryTable(data);
      });
      dbRef.on('child_added', snap => {
        const data = snap.val();
        updateHistoryTable(data);
      });
    }
  }, [appData.histories]);

  useEffect(() => {
    if (appData.loading === 'success') {
      const pendingHistories = appData.pendingHistories;
      setPendingData(pendingHistories);
      const dbRef = database.ref(pendingHistoryURL + '/');
    }
  }, [appData.pendingHistories])

  const updateHistoryTable = data => {
    setLogData(prev => {
      let newFlag = true;
      const updatedData = prev.map(log => {
        if (log.createdAt === data.createdAt) {
          newFlag = false;
          return data;
        } else {
          return log;
        }
      });
      if (newFlag) return [...updatedData, data];
      else return updatedData;
    });
  };

  const start = () => {
    socket.emit('start', { slippage });
    setExecutionState(true);
  };

  const stop = () => {
    socket.emit('stop');
    setExecutionState(false);
  };

  const clearLog = () => {
    setLogDialogFlog(false);
  };

  const showHistoryDetail = log => {
    setDetailShow(true);
    setSelectedLog(log);
  };

  const tokenSettingData = tokenLists.map(tokenList => {
    const token = { ...tokenList };
    token.buyTax = tokenList.buyTax;
    token.sellTax = tokenList.sellTax;
    token.taxToken = String(tokenList.taxToken);
    token.usdLimit = tokenList.usdLimit;
    return token;
  });



  const tradeHistoryData = logData.map(log => {
    const historyData = {
      createdAt: log.createdAt,
      tradeToken: log.token0.symbol,
      tradeAmount: log.start.amount,
      buyExchange: `${log.start.platform}:  ${log.start.realQuote}(${log.token1.symbol})`,
      sellExchange: `${log.end.platform}:  ${log.end.realQuote}(${log.token1.symbol})`,
      status: `${log.totalStatus} (BUY: ${log.start.status}, ${log.linkAction.action}: ${log.linkAction.status},  SELL: ${log.end.status})`,
    };

    historyData.actions = (
      <div>
        <Button variant="outline-success" size="sm" onClick={() => showHistoryDetail(log)}>
          {' '}
          Detail
        </Button>{' '}
      </div>
    );
    return historyData;
  });

  const dataTokenSettingTable = {
    columns: [
      {
        label: 'Token',
        field: 'symbol',
      },
      {
        label: 'Tax Token',
        field: 'taxToken',
      },
      {
        label: 'Buy Tax',
        field: 'buyTax',
      },
      {
        label: 'Sell Tax',
        field: 'sellTax',
      },
      {
        label: 'USD Limit',
        field: 'usdLimit',
      },

    ],
    rows: tokenSettingData,
  };
  const dataTransactionsTable = {
    columns: [
      {
        label: 'Txhash',
        field: 'txHash'
      },
      {
        label: 'Token',
        field: 'symbol',
      },
      {
        label: 'Trading Amount',
        field: 'tokenAmount'
      },
      {
        label: 'Is Profit',
        field: 'isProfit'
      },
      {
        label: 'Profit',
        field: 'usdLimit',
      },

    ],
    rows: [],
  };

  const dataLogTable = {
    columns: [
      {
        label: 'TimeStamp',
        field: 'createdAt',
        width: 150,
      },
      {
        label: 'Trade Token',
        field: 'tradeToken',
        width: 270,
      },
      {
        label: 'Trade Amount',
        field: 'tradeAmount',
        width: 200,
      },
      {
        label: 'Status',
        field: 'status',
        width: 100,
      },
      {
        label: 'Detail',
        field: 'actions',
        width: 100,
      },
    ],
    rows: tradeHistoryData.reverse(),
  };

  const receivePriceSignal = data => {
    if (priceData.length > 0 && priceData.find(price => price.symbol === data.symbol)) {
      setPriceData(prev => {
        return prev.map(price => {
          if (price.symbol === data.symbol) {
            return {
              symbol: data.symbol,
              amount: data.amount,
              modified: data.modified,
              direction: price.direction,
              binance: data[price.direction].binance,
              binanceSwapFee: `${data[price.direction].binanceSwapFee.amount} ${data[price.direction].binanceSwapFee.currency.symbol}`,
              uniV2: data[price.direction].uniV2,
              uniV3: data[price.direction].uniV3,
              uniV3Fee: `${data[price.direction].uniV3Fee} USD`,
              profit: data[price.direction].etaProfit,
            };
          } else {
            return { ...price };
          }
        });
      });
    } else {
      const buy = {
        symbol: data.symbol,
        amount: data.amount,
        modified: data.modified,
        binance: data.buy.binance,
        binanceSwapFee: `${data.buy.binanceSwapFee.amount} ${data.buy.binanceSwapFee.currency.symbol}`,
        uniV2: data.buy.uniV2,
        uniV3: data.buy.uniV3,
        uniV3Fee: `${data.buy.uniV3Fee} USD`,
        profit: data.buy.etaProfit,
        direction: 'buy',
      };
      const sell = {
        symbol: data.symbol,
        amount: data.amount,
        modified: data.modified,
        binance: data.sell.binance,
        binanceSwapFee: `${data.sell.binanceSwapFee.amount} ${data.sell.binanceSwapFee.currency.symbol}`,
        uniV2: data.sell.uniV2,
        uniV3: data.sell.uniV3,
        uniV3Fee: `${data.sell.uniV3Fee} USD`,
        profit: data.sell.etaProfit,
        direction: 'sell',
      };
      setPriceData(prev => [...prev, buy, sell]);
    }
  };

  const receiveBotStatusSignal = data => {
    console.log("data", data);
    setExecutionState(data.status);
    if(data.slippage) {
      setSlippage(data.slippage);
    }
  };
  const test = data => {
    console.log(data);
  };
  useEffect(() => {
    socket.on('bot-status', receiveBotStatusSignal);
    socket.on('price-signal', receivePriceSignal);

    socket.on('price-test', test);

    return () => {
      socket.off('price-signal');
      socket.off('price-test');
      socket.off('bot-status');
    };
  });

  return (
    <div>
      <div className="row">
        <div className='col-12'>
          <Button variant={executionState ? 'danger' : 'success'} id="button-addon2" onClick={executionState ? () => stop() : () => start()}>
            {executionState ? 'Stop' : 'Start'}
          </Button>
          {/* <div style={{display: "flex"}}>
                  <Form.Group style={{marginBottom: "0", display: "flex", alignItems: "center"}}>
                    <Form.Control
                      as="select"
                      value={slippage}
                      onChange={e => { setSlippage(e.target.value); }}
                    >
                      <option value="0.1">0.1</option>
                      <option value="0.5">0.5</option>
                      <option value="1">1</option>
                    </Form.Control>
                  </Form.Group>
                 
                </div> */}
        </div>
        <div className="col-12">
          <Card bg="light" style={{ height: '20rem', overflow: 'scroll' }} border="primary">
            <Card.Body>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2>
                  {' '}
                  <GiReceiveMoney /> &nbsp;   Actived Token
                </h2>{' '}
                
              </div>
              <div className="col-12">
                <MDBDataTableV5 hover searching={false} entries={50} pagesAmount={10} data={dataTokenSettingTable} />
              </div>
            </Card.Body>
          </Card>
          <br />
          <Card bg="light" style={{ height: '20rem', overflow: 'scroll' }} border="primary">
            <Card.Body>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2>
                  {' '}
                  <GiReceiveMoney /> &nbsp;   Pending Transactions
                </h2>{' '}
                
              </div>
              <div className="col-12">
                <MDBDataTableV5 hover searching={false} entries={50} pagesAmount={10} data={dataTransactionsTable} />
              </div>
            </Card.Body>
          </Card>
          <br />
          <Card bg="light" style={{ height: '30rem', overflow: 'scroll' }} border="primary">
            <Card.Body>
              <div className="row">
                <div className="col-10">
                  <Card.Title>
                    <h2>
                      {' '}
                      <BsClockHistory /> &nbsp; Trade Log
                    </h2>{' '}
                  </Card.Title>
                </div>
                <div className="col-2">
                  <Button variant="primary" id="button-addon2" onClick={() => setLogDialogFlog(true)}>
                    clear
                  </Button>
                </div>
              </div>
              <hr />

              <MDBDataTableV5 hover entriesOptions={[10, 20, 50, 100, 200, 500, 1000]} entries={50} pagesAmount={1000} data={dataLogTable} />
            </Card.Body>
          </Card>
        </div>
      </div>
      <Modal show={isLogDialogFlog}>
        <Modal.Header closeButton onClick={() => setLogDialogFlog(false)}>
          <Modal.Title>Clear Log</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setLogDialogFlog(false)}>
            No
          </Button>
          <Button variant="primary" onClick={() => clearLog()}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={detailShow} onHide={() => setDetailShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Trade History Detail</Modal.Title>
        </Modal.Header>
        {selectedLog && (
          <Modal.Body>
            <div className="row">
              <div className="col-12">
                <span style={{ fontWeight: '600' }}>Created: </span>
                <span>{selectedLog.createdAt}</span>
              </div>
            </div>
            <div className="row">
              <div className="col-6">
                <span style={{ fontWeight: '600' }}>Token: </span>
                <span>{selectedLog.token0 ? selectedLog.token0.symbol : ''}</span>
              </div>
              <div className="col-6">
                <span style={{ fontWeight: '600' }}>Amount: </span>
                <span>{selectedLog.start ? selectedLog.start.amount : ''}</span>
              </div>
            </div>
            <div className="row">
              <div className="col-5">
                <span style={{ fontWeight: '600' }}>{selectedLog.linkAction ? selectedLog.linkAction.action : ''} </span>
                <span>{selectedLog.linkAction ? selectedLog.linkAction.status : ''}</span>
              </div>
            </div>
            <div className="row">
              <div className="col-5">
                <span style={{ fontWeight: '600' }}>BUY Exchange </span>
              </div>
            </div>
            <div className="row">
              <div className="col-1"></div>
              <div className="col-3">
                <span style={{ fontWeight: '600' }}>Platform: </span>
                <span>{selectedLog.start ? selectedLog.start.platform : ''}</span>
              </div>
              <div className="col-3 d-flex flex-column">
                <span style={{ fontWeight: '600' }}>Amount: </span>
                <span>{selectedLog.start ? selectedLog.start.realQuote : ''}</span>
              </div>
              <div className="col-3 d-flex flex-column">
                <span style={{ fontWeight: '600' }}>Fee: </span>
                <span>{selectedLog.start ? selectedLog.start.realFee.toFixed(6) : ''}</span>
              </div>
              <div className="col-2 d-flex flex-column">
                <span style={{ fontWeight: '600' }}>Status: </span>
                <span>{selectedLog.start ? selectedLog.start.status : ''}</span>
              </div>
            </div>
            <div className="row">
              <div className="col-1"></div>
              <div className="col-11">
                <span>{selectedLog.start ? selectedLog.start.comment : ''}</span>
              </div>
            </div>
            <div className="row">
              <div className="col-5">
                <span style={{ fontWeight: '600' }}>SELL Exchange </span>
              </div>
            </div>
            <div className="row">
              <div className="col-1"></div>
              <div className="col-3">
                <span style={{ fontWeight: '600' }}>Platform: </span>
                <span>{selectedLog.end ? selectedLog.end.platform : ''}</span>
              </div>
              <div className="col-3 d-flex flex-column">
                <span style={{ fontWeight: '600' }}>Amount: </span>
                <span>{selectedLog.end ? selectedLog.end.realQuote : ''}</span>
              </div>
              <div className="col-3 d-flex flex-column">
                <span style={{ fontWeight: '600' }}>Fee: </span>
                <span>{selectedLog.end ? selectedLog.end.realFee.toFixed(6) : ''}</span>
              </div>
              <div className="col-2 d-flex flex-column">
                <span style={{ fontWeight: '600' }}>Status: </span>
                <span>{selectedLog.end ? selectedLog.end.status : ''}</span>
              </div>
            </div>
            <div className="row">
              <div className="col-1"></div>
              <div className="col-11">
                <span>{selectedLog.end ? selectedLog.end.comment : ''}</span>
              </div>
            </div>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDetailShow(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
export default Display;

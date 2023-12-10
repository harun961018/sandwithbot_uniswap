import { ethers } from 'ethers';
import React, { useState } from 'react';
import { MDBDataTableV5 } from 'mdbreact';
import { useSelector, useDispatch } from 'react-redux';
import { InputGroup, FormControl, Button, Form, Modal } from 'react-bootstrap';

import { addToken, removeToken, updateToken } from '../../store/reducers/app-slice';

const TokenList = ({ socket }) => {
  const dispatch = useDispatch();
  const appData = useSelector(state => state.app);
  const [address, setAddress] = useState('');
  const [show, setShow] = useState(false);
  const [editModalVisiable, setEditModalVisiable] = useState(false);
  const [selectedToken, setSelectedToken] = useState();

  const handleClose = () => {
    setShow(false);
    setAddress('');
  };

  const handleShow = () => setShow(true);

  const handleAddress = e => {
    setAddress(e.target.value);
  };

  const addTokenList = () => {
    setShow(false);
    if (address === '') {
      alert('Please check Address');
      return;
    } else {
      try {
        const checksumAddress = ethers.utils.getAddress(address);
        dispatch(addToken(checksumAddress));
      } catch (e) {
        alert('Invalid token address');
      }
    }
    setAddress('');
  };

  const deleteTokenList = id => {
    dispatch(removeToken(id));
  };

  const setTokenActive = crypto => {
    dispatch(updateToken({ ...crypto, active: !crypto.active }));
  };

  const showEditModal = (token, visible) => {
    setSelectedToken(token);
    setEditModalVisiable(visible);
  };

  const handleUpdate = token => {
    dispatch(updateToken({ ...crypto, ...token }));
    setEditModalVisiable(false);
  };

  const rows = appData.tokens.map(crypto => {
    const row = { ...crypto };
    row.actions = (
      <div>
        <Button
          variant={`${crypto.active ? 'primary' : 'danger'}`}
          size="sm"
          value={crypto.active ? 'Active' : 'Disable'}
          onClick={() => setTokenActive(crypto)}
        >
          {!crypto.active ? 'Active' : 'Disable'}
        </Button>
        <Button variant={'primary'} size="sm" value={'Edit'} onClick={() => showEditModal(crypto, true)}>
          {'Edit'}
        </Button>
        <Button variant="outline-danger" size="sm" onClick={() => deleteTokenList(crypto.key)}>
          Delete
        </Button>
      </div>
    );
    row.active = row.active ? 'Actived' : 'Disabled';
    return row;
  });

  const data = {
    columns: [
      {
        label: 'No',
        field: 'id',
        width: 50,
      },
      {
        label: 'Token Symbol',
        field: 'symbol',
        width: 50,
      },
      {
        label: 'Token Address',
        field: 'address',
        width: 150,
      },
      {
        label: 'Decimals',
        field: 'decimals',
        width: 50,
      },
      {
        label: 'Min Amount',
        field: 'minAmount',
        width: 50,
      },
      {
        label: 'Max Amount',
        field: 'maxAmount',
        width: 50,
      },
      {
        label: 'Benefit Limit',
        field: 'benefitLimit',
        width: 50,
      },
      {
        label: 'Monitoring Limit',
        field: 'monitLimit',
        width: 50,
      },
      {
        label: 'Actions',
        field: 'actions',
        width: 100,
      },
    ],
    rows: rows,
  };

  return (
    <div>
      <h2>Token List</h2>
      <hr />
      <br />
      <br />
      <Button variant="primary" onClick={handleShow}>
        Add Token
      </Button>
      <br />
      <br />
      <MDBDataTableV5 hover entriesOptions={[10, 20, 50, 100, 200, 500, 1000]} entries={50} pagesAmount={10} data={data} materialSearch />
      <br />
      <br />
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Add Token Address</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup className="mb-3">
            <InputGroup.Text id="basic-addon3">Address</InputGroup.Text>
            <FormControl id="basic-url1" aria-describedby="basic-addon3" type="text" placeholder="0x" defaultValue={address} onChange={handleAddress} />
          </InputGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={addTokenList}>
            Add token
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={editModalVisiable} onHide={() => setEditModalVisiable(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedToken ? `Edit Token - ${selectedToken.symbol}` : ''}</Modal.Title>
        </Modal.Header>
        {selectedToken && (
          <Modal.Body>
            <div className="row">
              <div className="col-12">
                <InputGroup className="mb-3">
                  <InputGroup.Text id="basic-addon3">Address</InputGroup.Text>
                  <Form.Control aria-describedby="basic-addon3" defaultValue={selectedToken.address} readOnly={true} />
                </InputGroup>
              </div>
            </div>
            <div className="row">
              <div className="col-6">
                <InputGroup className="mb-3">
                  <InputGroup.Text id="basic-addon3">Symbol</InputGroup.Text>
                  <Form.Control aria-describedby="basic-addon3" defaultValue={selectedToken.symbol} readOnly={true} />
                </InputGroup>
              </div>
              <div className="col-6">
                <InputGroup className="mb-3">
                  <InputGroup.Text id="basic-addon3">Decimals</InputGroup.Text>
                  <Form.Control aria-describedby="basic-addon3" defaultValue={selectedToken.decimals} readOnly={true} />
                </InputGroup>
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                <InputGroup className="mb-3">
                  <InputGroup.Text id="basic-addon3">Min amount</InputGroup.Text>
                  <Form.Control
                    id="basic-url"
                    aria-describedby="basic-addon3"
                    defaultValue={selectedToken.minAmount}
                    type="number"
                    pattern="^[0-9]*[.,].?[0-9]*"
                    onChange={e =>
                      setSelectedToken(prev => {
                        return { ...prev, minAmount: e.target.value };
                      })
                    }
                  />
                </InputGroup>
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                <InputGroup className="mb-3">
                  <InputGroup.Text id="basic-addon3">Max amount</InputGroup.Text>
                  <Form.Control
                    id="basic-url"
                    aria-describedby="basic-addon3"
                    defaultValue={selectedToken.maxAmount}
                    type="number"
                    pattern="^[0-9]*[.,].?[0-9]*"
                    onChange={e =>
                      setSelectedToken(prev => {
                        return { ...prev, maxAmount: e.target.value };
                      })
                    }
                  />
                </InputGroup>
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                <InputGroup className="mb-3">
                  <InputGroup.Text id="basic-addon3">{`Benefit limit`}</InputGroup.Text>
                  <Form.Control
                    aria-describedby="basic-addon3"
                    defaultValue={selectedToken.benefitLimit}
                    type="number"
                    pattern="^[0-9]*[.,].?[0-9]*"
                    onChange={e =>
                      setSelectedToken(prev => {
                        return { ...prev, benefitLimit: e.target.value };
                      })
                    }
                  />
                </InputGroup>
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                <InputGroup className="mb-3">
                  <InputGroup.Text id="basic-addon3">{`Swap monitoring limit`}</InputGroup.Text>
                  <Form.Control
                    aria-describedby="basic-addon3"
                    defaultValue={selectedToken.monitLimit}
                    type="number"
                    pattern="^[0-9]*[.,].?[0-9]*"
                    onChange={e =>
                      setSelectedToken(prev => {
                        return { ...prev, monitLimit: e.target.value };
                      })
                    }
                  />
                </InputGroup>
              </div>
            </div>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditModalVisiable(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => handleUpdate(selectedToken)}>
            Ok
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TokenList;

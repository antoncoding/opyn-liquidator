import React, { Component } from 'react';
import { Box, Split, Header, IdentityBadge } from '@aragon/ui';
import { getOptionContractDetail } from '../../utils/infura';

class VaultBox extends Component {
  _isMounted = false;

  state = {
    name: 'oToken',
    balance: '0',
    supply: '0',
  };

  async componentDidMount() {
    this._isMounted = true
    const { balance, totalSupply, name } = await getOptionContractDetail(this.props.oToken);
    if(this._isMounted)
    this.setState({ balance, supply: totalSupply, name });
  }

  componentWillUnmount(){
    this._isMounted = false
  }  

  render() {
    return (
      <>
        <Header
          primary={this.state.name}
        />
        <Split
          primary={
            <Split
              primary={
                <Box heading={'contract'} padding={20}>
                  <IdentityBadge entity={this.props.oToken} shorten={false} />
                </Box>
              }
              secondary={
                <Box heading={'balance'} padding={20}>
                  {this.state.balance}
                </Box>
              }
            />
          }
          secondary={
            <Box heading={'supply'} padding={20}>
              {this.state.supply} {this.props.tokenName}
            </Box>
          }
        />
      </>
    );
  }
}

export default VaultBox;

import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "../Token/Token.css"
import WalletState, { CHAIN_ID, ZERO_ADDRESS, CHAIN_ERROR_TIP, CHAIN_SYMBOL, MAX_INT } from '../../state/WalletState';
import toast from '../../components/toast/toast'

import copy from 'copy-to-clipboard';
import IconQQ from "../../images/IconQQ.png"

import Header from '../Header';

class More extends Component {
    state = {
        chainId: 0,
        account: "",
        lang: "EN",
    }
    constructor(props) {
        super(props);
    }
    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
        if (this.refreshInfoIntervel) {
            clearInterval(this.refreshInfoIntervel);
        }
    }

    handleAccountsChanged = () => {
        console.log(WalletState.wallet.lang);
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account,
            lang: WalletState.wallet.lang,
            local: page.getLocal()
        });
    }

    getLocal() {
        let local = {};
        return local;
    }

    copyQQ() {
        if (copy('103682866')) {
            toast.show("QQ群号已复制");
        } else {
            toast.show("复制失败");
        }
    }

    connectWallet() {
        WalletState.connetWallet();
    }

    routerTo(path, e) {
        this.setState({ show: false })
        this.props.navigate(path);
    }

    render() {
        return (
            <div className="Token">
                <Header></Header>

                <div className="button ModuleTop" onClick={this.routerTo.bind(this, '/createWallets')}>批量创建钱包</div>

                <div className="button ModuleTop" onClick={this.routerTo.bind(this, '/presale')}>预售抢购</div>

                <div className="button ModuleTop" onClick={this.routerTo.bind(this, '/collect')}>归集钱包</div>

                

            </div>
        );
    }
}

export default withNavigation(More);
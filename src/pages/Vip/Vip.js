import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import WalletState, { MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import Web3 from 'web3'
import { ERC20_ABI } from '../../abi/erc20';
import { VipSale_ABI } from '../../abi/VipSale_ABI';
import '../Token/Token.css'

import Header from '../Header';
import { showFromWei, toWei, showFromWeiMore, toWeiMore } from '../../utils';
import BN from 'bn.js'
import moment from 'moment';

class Vip extends Component {
    state = {
        chainId: '',
        account: '',
        sales: [],
        vipChainId: 56,
        errChainTip: '请连接BSC链钱包购买VIP',
        index: -1,
    }

    constructor(props) {
        super(props);
        this.refreshInfo = this.refreshInfo.bind(this);
    }

    //页面加载完
    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
        this.refreshInfo();
    }

    //页面销毁前
    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
        if (this._refreshInfoIntervel) {
            clearInterval(this._refreshInfoIntervel);
        }
    }

    //监听链接钱包
    handleAccountsChanged = () => {
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account,
        });
        if (wallet.chainId && wallet.chainId != this.state.vipChainId) {
            toast.show(this.state.errChainTip);
        }
    }

    _refreshInfoIntervel;
    refreshInfo() {
        if (this._refreshInfoIntervel) {
            clearInterval(this._refreshInfoIntervel);
        }
        this._refreshInfoIntervel = setInterval(() => {
            this.getInfo();
        }, 3000);
    }

    async getInfo() {
        if (this.state.vipChainId != this.state.chainId) {
            return;
        }
        try {
            const web3 = new Web3(Web3.givenProvider);
            const saleContract = new web3.eth.Contract(VipSale_ABI, WalletState.configs.VipSale);
            //获取基本信息
            let baseInfo = await saleContract.methods.shopInfo().call();
            //USDT合约地址
            let usdtAddress = baseInfo[0];
            //USDT精度
            let usdtDecimals = parseInt(baseInfo[1]);
            //USDT符号
            let usdtSymbol = baseInfo[2];
            //代币合约地址
            let tokenAddress = baseInfo[3];
            //代币精度
            let tokenDecimals = parseInt(baseInfo[4]);
            //代币符号
            let tokenSymbol = baseInfo[5];
            //当前区块时间
            let blockTime = parseInt(baseInfo[6]);
            //共收入多少代币
            let totalToken = baseInfo[7];

            //销售列表
            const allSales = await saleContract.methods.allSales().call();
            //价格(USDT计价)
            let priceUsdts = allSales[0];
            //价格(代币计价)
            let priceTokens = allSales[1];
            //有效期
            let durations = allSales[2];

            let sales = [];
            let len = priceUsdts.length;
            for (let i = 0; i < len; ++i) {
                let priceUsdt = priceUsdts[i];
                let priceToken = priceTokens[i];
                let duration = durations[i];
                let showDuration;
                if (new BN(duration, 10).eq(new BN(MAX_INT, 10))) {
                    showDuration = '永久';
                } else {
                    showDuration = (parseInt(duration) / 86400) + '天';
                }
                sales.push({
                    priceUsdt: priceUsdt,
                    showPriceUsdt: showFromWei(priceUsdt, usdtDecimals, 2),
                    priceToken: priceToken,
                    showPriceToken: showFromWei(priceToken, tokenDecimals, 4),
                    duration: duration,
                    showDuration: showDuration,
                })
            }

            this.setState({
                usdtAddress: usdtAddress,
                usdtDecimals: usdtDecimals,
                usdtSymbol: usdtSymbol,
                tokenAddress: tokenAddress,
                tokenDecimals: tokenDecimals,
                tokenSymbol: tokenSymbol,
                blockTime: blockTime,
                sales: sales,
            });

            let account = WalletState.wallet.account;
            if (account) {
                //获取用户信息
                const userInfo = await saleContract.methods.getUserInfo(account).call();
                //购买Vip共消费多少
                let amount = userInfo[0];
                //Vip过期时间
                let endTime = userInfo[1];
                //代币余额
                let tokenBalance = userInfo[2];
                //代币授权额度
                let tokenAllowance = userInfo[3];

                let showEndTime;
                if (new BN(endTime, 10).eq(new BN(MAX_INT, 10))) {
                    showEndTime = '永久有效';
                } else if (parseInt(endTime) == 0) {
                    showEndTime = '未购买会员';
                } else {
                    showEndTime = this.formatTime(parseInt(endTime));
                }

                this.setState({
                    amount: amount,
                    showAmount: showFromWei(amount, tokenDecimals, 4),
                    endTime: endTime,
                    showEndTime: showEndTime,
                    tokenBalance: tokenBalance,
                    showTokenBalance: showFromWei(tokenBalance, tokenDecimals, 4),
                    tokenAllowance: tokenAllowance,
                });
            }
        } catch (e) {
            console.log("getInfo", e.message);
            toast.show(e.message);
        } finally {
        }
    }

    formatTime(timestamp) {
        return moment(new BN(timestamp, 10).mul(new BN(1000)).toNumber()).format("YYYY-MM-DD HH:mm:ss");
    }

    //选择Vip种类
    selVip(index, e) {
        this.setState({
            index: index,
        })
    }

    //Vip种类样式
    getVipItemClass(index) {
        if (index == this.state.index) {
            return 'Vip-Item Item-Sel';
        }
        return 'Vip-Item Item-Nor';
    }

    //购买Vip
    async buyVip() {
        let account = WalletState.wallet.account;
        if (!account) {
            this.connectWallet();
            return;
        }
        let index = this.state.index;
        if (-1 == index) {
            toast.show('请选择要购买的会员等级');
            return;
        }
        let sale = this.state.sales[index];
        //需要的代币价格
        let price = new BN(sale.priceToken, 10);
        //因为是U本位代币数量，需要加个滑点，别人交易会影响价格变动
        let maxPrice = price.mul(new BN(105)).div(new BN(100));
        let tokenBalance = new BN(this.state.tokenBalance, 10);
        if (tokenBalance.lt(maxPrice)) {
            toast.show(this.state.tokenSymbol + '余额不足');
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            let approvalNum = new BN(this.state.tokenAllowance, 10);;
            //代币授权额度不够了，需要重新授权
            if (approvalNum.lt(maxPrice)) {
                const tokenContract = new web3.eth.Contract(ERC20_ABI, this.state.tokenAddress);
                var transaction = await tokenContract.methods.approve(WalletState.configs.VipSale, MAX_INT).send({ from: account });
                if (!transaction.status) {
                    toast.show('授权失败');
                    return;
                }
            }

            const saleContract = new web3.eth.Contract(VipSale_ABI, WalletState.configs.VipSale);
            var estimateGas = await saleContract.methods.buy(index, maxPrice).estimateGas({ from: account });
            var transaction = await saleContract.methods.buy(index, maxPrice).send({ from: account });
            if (transaction.status) {
                toast.show("购买Vip成功");
            } else {
                toast.show("购买失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    render() {
        return (
            <div className="Token">
                <Header></Header>
                <div className=''></div>
                <div className='flex ModuleTop'>
                    {
                        this.state.sales.map((item, index) => {
                            return <div key={index} className={this.getVipItemClass(index)} onClick={this.selVip.bind(this, index)}>
                                <div className=''>{item.showDuration}</div>
                                <div className='mt5'>{item.showPriceUsdt}{this.state.usdtSymbol}</div>
                                <div className=''>{item.showPriceToken}{this.state.tokenSymbol}</div>
                            </div>
                        })
                    }
                </div>

                <div className="button ModuleTop mb20" onClick={this.buyVip.bind(this)}>购买VIP</div>

                <div className='LabelContainer mb20'>
                    <div className='Label'>余额：{this.state.showTokenBalance} {this.state.tokenSymbol}</div>
                    <div className='Label'>VIP有效期：{this.state.showEndTime}</div>
                </div>

            </div>
        );
    }
}

export default withNavigation(Vip);
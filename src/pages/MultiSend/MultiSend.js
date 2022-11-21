import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import WalletState, { MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import Web3 from 'web3'
import { ERC20_ABI } from '../../abi/erc20';
import { MultiSend_ABI } from '../../abi/MultiSend_ABI';
import { VipSale_ABI } from '../../abi/VipSale_ABI';
import "../ImportVip/ImportVip.css"
import '../Token/Token.css'

import Header from '../Header';
import { toWei, showAccount, showFromWei } from '../../utils';
import BN from 'bn.js'
import copy from 'copy-to-clipboard';
import IconCopy from "../../images/IconCopy.png"

class MultiSend extends Component {
    state = {
        chainId: '',
        account: '',
        wallets: [],
        address: [],
        //代币合约
        tokenAddress: null,
        //代币符号
        tokenSymbol: null,
        //代币精度
        tokenDecimals: null,
        //当前选择的链符号
        chain: WalletState.wallet.chain,
        //当前选择的链配置
        chainConfig: WalletState.wallet.chainConfig,
        //检测Vip的Rpc
        CheckVipRpc: WalletState.configs.CheckVipRpc,
        //是否Vip
        isVip: false,
    }

    constructor(props) {
        super(props);
        this.handleTxtFileReader = this.handleTxtFileReader.bind(this);
    }

    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
    }

    //监听链接钱包，配置变化
    handleAccountsChanged = () => {
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account,
        });
        let chainConfig = wallet.chainConfig;
        if (wallet.chainId && wallet.chainId != chainConfig.ChainId) {
            toast.show('请连接 ' + chainConfig.Symbol + ' 链')
        }
        //链发生变化，一些配置信息要重置
        if (chainConfig.ChainId != this.state.chainConfig.ChainId) {
            page.setState({
                chain: wallet.chain,
                chainConfig: chainConfig,
            })
        }
        //切换链后，重新获取钱包余额
        //配置未更新，延迟请求
        setTimeout(() => {
            this.getWalletBalance(wallet.account);
        }, 100);
    }

    //获取钱包主币、代币余额
    async getWalletBalance(account) {
        if (!account) {
            return;
        }
        try {
            const myWeb3 = new Web3(Web3.givenProvider);

            //获取主币余额
            let balance = await myWeb3.eth.getBalance(account);
            let showBalance = showFromWei(balance, 18, 4);

            let tokenSymbol = this.state.tokenSymbol;

            let showTokenBalance = 0;
            if (tokenSymbol) {
                //获取代币余额
                const tokenContract = new myWeb3.eth.Contract(ERC20_ABI, this.state.tokenAddress);
                let tokenBalance = await tokenContract.methods.balanceOf(account).call();
                showTokenBalance = showFromWei(tokenBalance, this.state.tokenDecimals, 4);
            }

            this.setState({
                balance: showBalance,
                tokenBalance: showTokenBalance,
            })
            this.checkVip();
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
        }
    }

    //检测是否VIP，需要用检测VIP的RPC，该RPC，总是BSC链的RPC
    async checkVip() {
        let account = this.state.account;
        if (!account) {
            return;
        }
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.CheckVipRpc, options));
            const saleContract = new myWeb3.eth.Contract(VipSale_ABI, WalletState.configs.VipSale);
            //获取用户信息
            const userInfo = await saleContract.methods.getUserInfo(account).call();
            console.log('userInfo', userInfo);
            //Vip过期时间
            let endTime = userInfo[1];
            //当前区块时间
            let blockTime = parseInt(userInfo[4]);
            let isVip = false;
            //永久有效
            if (new BN(endTime, 10).eq(new BN(MAX_INT, 10))) {
                isVip = true;
            } else if (parseInt(endTime) >= blockTime) {
                //还没过期
                isVip = true;
            }

            this.setState({
                isVip: isVip,
            });
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
        }
    }

    //导入文件
    handleTxtFileReader(e) {
        let page = this;
        try {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = function (e) {
                var data = e.target.result;
                var allRows = data.split("\n");
                var wallets = [];
                var exits = {};
                var addressIndex = 0;
                var amountIndex = 1;
                var addrs = [];
                for (let singleRow = 0; singleRow < allRows.length; singleRow++) {
                    let rowCells = allRows[singleRow].split(',');

                    // 表格内容
                    //rowCells[rowCell];
                    let address = rowCells[addressIndex].replaceAll('\"', '');
                    if (exits[address]) {
                        console.log("exits", address);
                        continue;
                    }
                    exits[address] = true;
                    let amount = rowCells[amountIndex];
                    if (amount) {
                        amount = amount.replaceAll('\"', '').trim();
                    }
                    if (address) {
                        wallets.push({ address: address, amount: amount })
                        addrs.push(address);
                    }
                }
                page.setState({ wallets: wallets });
            }
            reader.readAsText(file);
        } catch (error) {
            console.log("error", error);
            toast.show(error);
        } finally {

        }
    }

    //转账主币
    async sendETH() {
        let account = WalletState.wallet.account;
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const MultiSendContract = new web3.eth.Contract(MultiSend_ABI, this.state.chainConfig.MultiSend);
            let tos = [];
            let amounts = [];
            let wallets = this.state.wallets;
            let length = wallets.length;
            //总转账金额
            let value = new BN(0);
            for (let index = 0; index < length; index++) {
                tos.push(wallets[index].address);
                //转账精度处理
                let amount = toWei(wallets[index].amount, 18);
                amounts.push(amount);
                value = value.add(amount);
            }
            var estimateGas = await MultiSendContract.methods.sendETHs(tos, amounts).estimateGas({ from: account, value: value });
            var transaction = await MultiSendContract.methods.sendETHs(tos, amounts).send({ from: account, value: value });
            if (transaction.status) {
                toast.show("已经批量转账" + this.state.chainConfig.Symbol);
            } else {
                toast.show("转账失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //确定代币合约地址
    async confirmToken() {
        let tokenAddress = this.state.tokenAddress;
        if (!tokenAddress) {
            toast.show('请输入正确的代币合约地址');
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
            let tokenSymbol = await tokenContract.methods.symbol().call();
            let tokenDecimals = await tokenContract.methods.decimals().call();
            tokenDecimals = parseInt(tokenDecimals);
            this.setState({
                tokenDecimals: tokenDecimals,
                tokenSymbol: tokenSymbol,
            })
            this.getWalletBalance(this.state.account);
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //批量转账代币
    async sendToken() {
        let account = WalletState.wallet.account;
        if (!this.state.tokenSymbol) {
            toast.show('请输入正确的代币合约地址，并点击确定按钮获取代币信息');
            return;
        }
        let tos = [];
        let amounts = [];
        let wallets = this.state.wallets;
        let length = wallets.length;
        if (0 == length) {
            toast.show('请导入转账接收地址列表');
            return;
        }
        let tokenDecimals = this.state.tokenDecimals;
        for (let index = 0; index < length; index++) {
            tos.push(wallets[index].address);
            amounts.push(toWei(wallets[index].amount, tokenDecimals));
        }
        loading.show();
        let tokenAddress = this.state.tokenAddress;
        try {
            const web3 = new Web3(Web3.givenProvider);
            const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
            let MultiSendAddress = this.state.chainConfig.MultiSend;
            let allowance = await tokenContract.methods.allowance(account, MultiSendAddress).call();
            allowance = new BN(allowance, 10);
            if (allowance.isZero()) {
                let transaction = await tokenContract.methods.approve(MultiSendAddress, MAX_INT).send({ from: account });
                if (!transaction.status) {
                    toast.show("授权失败");
                    return;
                }
            }

            const MultiSendContract = new web3.eth.Contract(MultiSend_ABI, MultiSendAddress);
            var estimateGas = await MultiSendContract.methods.sendTokens(tokenAddress, tos, amounts).estimateGas({ from: account });
            var transaction = await MultiSendContract.methods.sendTokens(tokenAddress, tos, amounts).send({ from: account });
            if (transaction.status) {
                toast.show("已经批量转账" + this.state.tokenSymbol);
            } else {
                toast.show("转账失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    handleTokenAddressChange(event) {
        let value = event.target.value;
        this.setState({
            tokenAddress: value,
            tokenDecimals: 0,
            tokenSymbol: null,
        })
    }

    //获取单个钱包余额
    async getTokenBalance(wallet, index) {
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };

            const myWeb3 = new Web3(Web3.givenProvider);
            if (this.state.tokenSymbol) {
                const tokenContract = new myWeb3.eth.Contract(ERC20_ABI, this.state.tokenAddress);
                let tokenBalance = await tokenContract.methods.balanceOf(wallet.address).call();
                let showTokenBalance = showFromWei(tokenBalance, this.state.tokenDecimals, 4);
                wallet.showTokenBalance = showTokenBalance;
            }
            let balance = await myWeb3.eth.getBalance(wallet.address);
            let showBalance = showFromWei(balance, 18, 4);
            wallet.showBalance = showBalance;
            this.setState({
                wallets: this.state.wallets,
            })
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
        }
    }

    //选择链
    selChain(index, e) {
        WalletState.changeChain(WalletState.configs.chains[index]);
    }

    //链选择样式
    getChainItemClass(item) {
        if (item == this.state.chainConfig.chain) {
            return 'Token-Item Item-Sel';
        }
        return 'Token-Item Item-Nor';
    }

    render() {
        return (
            <div className="Token ImportVip">
                <Header></Header>
                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>链：</div>
                    {
                        WalletState.configs.chains.map((item, index) => {
                            return <div key={index} className={this.getChainItemClass(item)} onClick={this.selChain.bind(this, index)}>
                                <div className=''>{item}</div>
                            </div>
                        })
                    }
                </div>
                <div className="mt20">
                    导入地址csv文件: <input type="file" onChange={this.handleTxtFileReader} />
                </div>
                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.tokenAddress} onChange={this.handleTokenAddressChange.bind(this)} placeholder='输入代币合约地址' />
                    <div className='Confirm' onClick={this.confirmToken.bind(this)}>确定</div>
                </div>

                <div className='ModuleTop flex'>
                    <div className="approveUsdt" onClick={this.sendETH.bind(this)}>批量转账{this.state.chainConfig.Symbol}</div>
                    <div className="approveToken" onClick={this.sendToken.bind(this)}>批量转账{this.state.tokenSymbol}代币</div>
                </div>
                <div className='LabelC Remark'>{this.state.chainConfig.Symbol}余额：{this.state.balance}</div>
                <div className='LabelC Remark'>{this.state.tokenSymbol}余额：{this.state.tokenBalance}</div>

                {
                    this.state.wallets.map((item, index) => {
                        return <div key={index} className="mt10 Item flex">
                            <div className='Index'>{index + 1}.</div>
                            <div className='text flex-1'> {item.address}</div>
                            <div className='text flex-1'>{item.amount}</div>
                        </div>
                    })
                }
            </div>
        );
    }
}

export default withNavigation(MultiSend);
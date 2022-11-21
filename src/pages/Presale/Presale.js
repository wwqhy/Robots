import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import WalletState, { MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import Web3 from 'web3'
import { ERC20_ABI } from '../../abi/erc20';
// import { PinkSale_ABI } from '../../abi/PinkSale_ABI';
import { PinkSaleTest_ABI } from '../../abi/PinkSaleTest_ABI';
import { DxSale_ABI } from '../../abi/DxSale_ABI';
import { VipSale_ABI } from '../../abi/VipSale_ABI';
import '../Token/Token.css'

import Header from '../Header';
import { showFromWei, toWei, showFromWeiMore, toWeiMore } from '../../utils';
import BN from 'bn.js'
import moment from 'moment';

class Presale extends Component {
    state = {
        chainId: '',
        account: '',
        //可供选择的链
        chains: [
            {
                chainId: 97,
                rpc: 'https://data-seed-prebsc-1-s3.binance.org:8545/',
                symbol: 'tBNB',
                chain: 'BSC-t',
                DxSaleInfoAddress: '0xbd3e37ff1427dce2b7c7dfbc843aa9a42672c529',
            }, {
                chainId: 56,
                rpc: 'https://bsc-dataseed1.binance.org/',
                symbol: 'BNB',
                chain: 'BSC',
                DxSaleInfoAddress: '0x7100c01f668a5b407db6a77821ddb035561f25b8',
            }],
        chainIndex: 0,
        chainSymbol: 'tBNB',
        //当前预售平台
        salePlatforms: [
            { name: 'PinkSale' },
            { name: 'DxSale' },
        ],
        platformIndex: 0,
        //输入框rpc
        tmpRpc: 'https://data-seed-prebsc-1-s3.binance.org:8545/',
        //真正使用的rpc
        rpcUrl: 'https://data-seed-prebsc-1-s3.binance.org:8545/',
        //私钥
        privateKey: null,
        //私钥对应的钱包信息
        wallet: {},
        //预售链接输入框
        saleUrl: null,
        //预售信息
        saleInfo: {},
        //抢购数量
        amountIn: null,
        //gas倍数，默认1倍
        gasMulti: null,
        //检测Vip的Rpc
        CheckVipRpc: WalletState.configs.CheckVipRpc,
        //是否Vip
        isVip: false,
        //使用固定的gasLimit发送交易
        gasLimit: '300000',
        //是否烧gas模式
        gasMode: false,
    }

    constructor(props) {
        super(props);
    }

    //页面加载完
    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
    }

    //页面销毁前
    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
        this.clearCheckBuyInterval();
    }

    //监听链接钱包，配置变化
    handleAccountsChanged = () => {
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account,
        });
    }

    //rpc输入框变化
    handleRpcUrlChange(event) {
        let value = event.target.value;
        this.setState({
            tmpRpc: value
        })
    }

    //确定rpc
    async confirmRpcUrl() {
        this.setState({
            rpcUrl: this.state.tmpRpc
        })
    }

    //私钥输入框变化
    handlePrivateKeyChange(event) {
        this.clearCheckBuyInterval();
        let value = event.target.value;
        this.setState({
            privateKey: value,
            wallet: {},
        });
    }

    //确定私钥
    async confirmPrivateKey() {
        let privateKey = this.state.privateKey;
        let options = {
            timeout: 600000, // milliseconds,
            headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
        };
        const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
        try {
            //私钥推导账户信息
            let account = myWeb3.eth.accounts.privateKeyToAccount(privateKey);
            let wallet = {
                //私钥
                privateKey: privateKey,
                //地址
                address: account.address,
                //主币余额
                showBalance: 0,
            };
            //当前钱包
            this.setState({
                wallet: wallet,
            });
            this.getWalletBalance(wallet);
        } catch (e) {
            console.log('confirmPrivateKey', e.message);
            toast.show(e.message);
        }
    }

    //获取钱包主币
    async getWalletBalance(wallet) {
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            //获取主币余额
            let balance = await myWeb3.eth.getBalance(wallet.address);
            let showBalance = showFromWei(balance, 18, 4);
            wallet.balance = new BN(balance, 10);
            wallet.showBalance = showBalance;
            this.setState({
                wallet: wallet,
            })
            this.checkVip(wallet);
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
        }
    }

    //检测是否VIP，需要用检测VIP的RPC，该RPC，总是BSC链的RPC
    async checkVip(wallet) {
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.CheckVipRpc, options));
            const saleContract = new myWeb3.eth.Contract(VipSale_ABI, WalletState.configs.VipSale);
            //获取用户信息
            const userInfo = await saleContract.methods.getUserInfo(wallet.address).call();
            console.log('userInfo', userInfo);
            //Vip过期时间
            let endTime = userInfo[1];
            //当前区块时间
            let blockTime = parseInt(userInfo[4]);
            // let isVip = false;
            //测试使用
            let isVip = true;
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

    //预售链接输入框变化
    handleSaleUrlChange(event) {
        this.clearCheckBuyInterval();
        let value = event.target.value;
        this.setState({
            saleUrl: value,
            saleInfo: {},
        })
    }

    //确定预售链接，通过预售链接获取预售信息和代币信息
    async confirmSaleUrl() {
        let saleUrl = this.state.saleUrl;
        if (!saleUrl) {
            toast.show('请输入预售链接');
            return;
        }
        let salePlatform = this.state.salePlatforms[this.state.platformIndex];
        //DxSale 预售平台处理
        if ('DxSale' == salePlatform.name) {
            this.confirmDxSaleUrl(saleUrl);
            return;
        }
        let saleAddress = this.getPinkSaleAddress(saleUrl);
        console.log('saleAddress', saleAddress);
        if (!saleAddress) {
            toast.show('请输入正确的预售链接');
            return;
        }
        loading.show();
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            let saleContract;
            if (this.state.chainSymbol == 'tBNB') {
                saleContract = new myWeb3.eth.Contract(PinkSaleTest_ABI, saleAddress);
            } else {
                saleContract = new myWeb3.eth.Contract(PinkSaleTest_ABI, saleAddress);

            }
            //创建者地址
            let owner = await saleContract.methods.owner().call();
            console.log('owner', owner);
            //预售合约里获取预售信息，包括代币合约
            let poolSettings = await saleContract.methods.poolSettings().call({});
            //代币合约
            let tokenAddress = poolSettings[0];
            console.log('tokenAddress', tokenAddress);
            //支付代币，我们目前只做主币的预售，暂时不管
            let currency = poolSettings[1];
            //开始时间
            let startTime = parseInt(poolSettings[2]);
            //结束时间
            let endTime = parseInt(poolSettings[3]);
            //代币合约
            let tokenContract = new myWeb3.eth.Contract(ERC20_ABI, tokenAddress);
            //代币名称
            let tokenName = await tokenContract.methods.name().call();
            console.log('tokenName', tokenName);
            //代币符号
            let tokenSymbol = await tokenContract.methods.symbol().call();
            console.log('tokenSymbol', tokenSymbol);

            let saleInfo = {
                saleAddress: saleAddress,
                startTime: this.formatTime(startTime),
                endTime: this.formatTime(endTime),
                tokenAddress: tokenAddress,
                tokenName: tokenName,
                tokenSymbol: tokenSymbol,
                owner: owner,
            }
            this.setState({
                saleInfo: saleInfo,
            })

            //获取钱包余额
            if (this.state.wallet.privateKey) {
                this.getWalletBalance(this.state.wallet);
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //确认DxsaleId
    async confirmDxSaleUrl(saleUrl) {
        let saleId = this.getDxSaleId(saleUrl);
        console.log('saleId', saleId);
        if (!saleId) {
            toast.show('请输入正确的预售链接');
            return;
        }
        loading.show();
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            let chain = this.state.chains[this.state.chainIndex];
            let dxSaleInfoAddress = chain.DxSaleInfoAddress;
            let saleInfoContract = new myWeb3.eth.Contract(DxSale_ABI, dxSaleInfoAddress);
            //创建者地址
            let owner = await saleInfoContract.methods.presaleOwners(saleId).call();
            console.log('owner', owner);
            //预售信息合约里获取预售信息，包括代币合约
            let poolSettings = await saleInfoContract.methods.presales(owner).call({});
            console.log('poolSettings', poolSettings);
            //代币合约
            let tokenAddress = poolSettings[3];
            //预售合约
            let saleAddress = poolSettings[4];
            console.log('tokenAddress', tokenAddress);
            //开始时间
            let startTime = parseInt(poolSettings[7]);
            //结束时间
            let endTime = parseInt(poolSettings[8]);
            //代币合约
            let tokenContract = new myWeb3.eth.Contract(ERC20_ABI, tokenAddress);
            //代币名称
            let tokenName = await tokenContract.methods.name().call();
            console.log('tokenName', tokenName);
            //代币符号
            let tokenSymbol = await tokenContract.methods.symbol().call();
            console.log('tokenSymbol', tokenSymbol);

            let saleInfo = {
                saleAddress: saleAddress,
                startTime: this.formatTime(startTime),
                endTime: this.formatTime(endTime),
                tokenAddress: tokenAddress,
                tokenName: tokenName,
                tokenSymbol: tokenSymbol,
                owner: owner,
            }
            this.setState({
                saleInfo: saleInfo,
            })

            //获取钱包余额
            if (this.state.wallet.privateKey) {
                this.getWalletBalance(this.state.wallet);
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //获取Dx预售Id
    getDxSaleId(saleUrl) {
        let saleId = null;
        let scan_url = saleUrl.split("?");
        if (2 == scan_url.length) {
            scan_url = scan_url[1];
            let strs = scan_url.split("&");
            for (let x in strs) {
                let arr = strs[x].split("=");
                //链接里有saleID
                if ("saleID" == arr[0] && arr[1]) {
                    return arr[1];
                }
            }
        }
        return saleId;
    }

    formatTime(timestamp) {
        return moment(new BN(timestamp, 10).mul(new BN(1000)).toNumber()).format("YYYY-MM-DD HH:mm:ss");
    }

    //获取粉红预售合约地址
    getPinkSaleAddress(saleUrl) {
        let saleAddress = null;
        let pathUrl;
        let scan_url = saleUrl.split("?");
        if (2 == scan_url.length) {
            pathUrl = scan_url[0];
        } else {
            pathUrl = saleUrl;
        }

        let startIndex = pathUrl.lastIndexOf("/");
        saleAddress = pathUrl.substring(startIndex + 1);
        return saleAddress;
    }

    //抢购数量输入框变化
    handleAmountInChange(event) {
        this.clearCheckBuyInterval();
        let value = this.state.amountIn;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ amountIn: value });
    }


    //抢购定时器
    _refreshCheckBuyIntervel = null;
    //抢购
    async panicBuying() {
        this.clearCheckBuyInterval();
        if (!this.state.wallet.privateKey) {
            toast.show('请输入私钥导入钱包');
            return;
        }
        if (!this.state.isVip) {
            toast.show('仅限VIP使用');
            return;
        }
        if (!this.state.amountIn) {
            toast.show('请输入抢购数量');
            return;
        }
        if (!this.state.saleInfo || !this.state.saleInfo.saleAddress) {
            toast.show('请输入预售链接获取预售信息');
            return;
        }
        let wallet = this.state.wallet;
        //使用之后，再刷新会员状态
        this.checkVip(wallet);
        this.setState({
            refreshStatus: 'buy',
        })
        this._refreshCheckBuyIntervel = setInterval(() => {
            this._panicBuying();
        }, 3000);
    }

    checking = false;
    //刷新代币信息，这里主要代币池子大小
    async _panicBuying() {
        if (this.checking) {
            return;
        }
        this.checking = true;
        try {
            this._buy();
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            this.checking = false;
        }
    }

    clearCheckBuyInterval() {
        this.setState({ refreshStatus: null })
        if (this._refreshCheckBuyIntervel) {
            clearInterval(this._refreshCheckBuyIntervel);
            this._refreshCheckBuyIntervel = null;
        }
    }

    //购买过程
    async _buy() {
        let salePlatform = this.state.salePlatforms[this.state.platformIndex];
        //DxSale 预售平台处理
        if ('DxSale' == salePlatform.name) {
            this._buyDxSale();
            return;
        }
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            let wallet = this.state.wallet;

            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            const saleContract = new myWeb3.eth.Contract(PinkSaleTest_ABI, this.state.saleInfo.saleAddress);
            let amountIn;
            //输入
            amountIn = toWei(this.state.amountIn, 18);

            var gasPrice = await myWeb3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            //gas倍数
            let gasMulti = this.state.gasMulti;
            if (!gasMulti) {
                gasMulti = 1;
            }
            gasMulti = parseFloat(gasMulti);
            gasMulti = parseInt(gasMulti * 100);
            gasPrice = gasPrice.mul(new BN(gasMulti)).div(new BN(100));

            //购买预售 Data
            let data = saleContract.methods.contribute().encodeABI();

            //钱包发起交易的nonce
            var nonce = await myWeb3.eth.getTransactionCount(wallet.address, "pending");
            console.log("nonce", nonce);

            //不是烧gas模式，通过预估手续费，检测交易是否成功
            if (!this.state.gasMode) {
                console.log("!gasMode");
                let gas = await saleContract.methods.contribute().estimateGas({ from: wallet.address, value: amountIn });
                console.log("!gasMode", gas);
            }

            //这里gasLimit直接用30万
            let gas = new BN(this.state.gasLimit, 10);

            let value = amountIn;
            //交易的to，是预售合约地址
            var txParams = {
                gas: Web3.utils.toHex(gas),
                gasPrice: Web3.utils.toHex(gasPrice),
                nonce: Web3.utils.toHex(nonce),
                chainId: this.state.chains[this.state.chainIndex].chainId,
                value: Web3.utils.toHex(value),
                to: this.state.saleInfo.saleAddress,
                data: data,
                from: wallet.address,
            };

            //gas费
            var fee = new BN(gas, 10).mul(new BN(gasPrice, 10));
            console.log("fee", Web3.utils.fromWei(fee, "ether"));

            await this._buyTx(myWeb3, wallet, txParams);
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //抢购Dxsale
    async _buyDxSale() {
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            let wallet = this.state.wallet;
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));

            let amountIn;
            //输入
            amountIn = toWei(this.state.amountIn, 18);

            var gasPrice = await myWeb3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            //gas倍数
            let gasMulti = this.state.gasMulti;
            if (!gasMulti) {
                gasMulti = 1;
            }
            gasMulti = parseFloat(gasMulti);
            gasMulti = parseInt(gasMulti * 100);
            gasPrice = gasPrice.mul(new BN(gasMulti)).div(new BN(100));

            //钱包发起交易的nonce
            var nonce = await myWeb3.eth.getTransactionCount(wallet.address, "pending");
            console.log("nonce", nonce);

            //Dxsale预售方式是直接往预售合约地址转账BNB
            let to = this.state.saleInfo.saleAddress;
            let value = amountIn;

            //不是烧gas模式，通过预估手续费，检测交易是否成功
            if (!this.state.gasMode) {
                console.log("!gasMode");
                let gas = await myWeb3.eth.estimateGas({
                    from: wallet.address,
                    to: to,
                    value: Web3.utils.toHex(value),
                });
                console.log("!gasMode", gas);
            }

            //这里gasLimit直接用30万
            let gas = new BN(this.state.gasLimit, 10);

            //交易的to，是预售合约地址
            var txParams = {
                gas: Web3.utils.toHex(gas),
                gasPrice: Web3.utils.toHex(gasPrice),
                nonce: Web3.utils.toHex(nonce),
                chainId: this.state.chains[this.state.chainIndex].chainId,
                value: Web3.utils.toHex(value),
                to: this.state.saleInfo.saleAddress,
                from: wallet.address,
            };

            //gas费
            var fee = new BN(gas, 10).mul(new BN(gasPrice, 10));
            console.log("fee", Web3.utils.fromWei(fee, "ether"));

            await this._buyTx(myWeb3, wallet, txParams);
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    async _buyTx(myWeb3, wallet, txParams) {
        try {
            //交易签名
            let privateKey = wallet.privateKey;
            var signedTx = await myWeb3.eth.accounts.signTransaction(txParams, privateKey);
            //发起购买，删除定时器，烧gas模式不删除定时器
            if (!this.state.gasMode) {
                this.clearCheckBuyInterval();
            }

            let transaction = await myWeb3.eth.sendSignedTransaction(signedTx.rawTransaction);
            // 交易失败
            if (!transaction.status) {
                toast.show("购买失败");
                return;
            }

            //购买成功删除定时器
            this.clearCheckBuyInterval();
            toast.show("购买成功");
            await this.getWalletBalance(wallet);
        } catch (e) {
            console.log("e", e);
        }
    }

    handleGasMultiChange(event) {
        let value = this.state.gasMulti;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ gasMulti: value });
    }

    //选择是否烧gas模式
    selGasMode() {
        this.clearCheckBuyInterval();
        this.setState({
            gasMode: !this.state.gasMode,
        })
    }

    //是否烧gas模式选择样式
    getGasModeClass() {
        if (this.state.gasMode) {
            return 'Token-Item Item-Sel';
        }
        return 'Token-Item Item-Nor';
    }

    //选择链
    selChain(index, e) {
        this.clearCheckBuyInterval();
        let chain = this.state.chains[index];
        this.setState({
            chainIndex: index,
            chainSymbol: chain.symbol,
            rpcUrl: chain.rpc,
            tmpRpc: chain.rpc,
        })
    }

    //链选择样式
    getChainItemClass(index) {
        if (index == this.state.chainIndex) {
            return 'Token-Item Item-Sel';
        }
        return 'Token-Item Item-Nor';
    }

    //选择预售平台
    selDex(index, e) {
        this.clearCheckBuyInterval();
        this.setState({
            platformIndex: index,
        })
    }

    //预售平台选择样式
    getDexItemClass(index) {
        if (index == this.state.platformIndex) {
            return 'Token-Item Item-Sel';
        }
        return 'Token-Item Item-Nor';
    }

    render() {
        return (
            <div className="Token">
                <Header></Header>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>链：</div>
                    {
                        this.state.chains.map((item, index) => {
                            return <div key={index} className={this.getChainItemClass(index)} onClick={this.selChain.bind(this, index)}>
                                <div className=''>{item.chain}</div>
                            </div>
                        })
                    }
                </div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>预售平台：</div>
                    {
                        this.state.salePlatforms.map((item, index) => {
                            return <div key={index} className={this.getDexItemClass(index)} onClick={this.selDex.bind(this, index)}>
                                <div className=''>{item.name}</div>
                            </div>
                        })
                    }
                </div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>RPC：</div>
                    <input className="ModuleBg" type="text" value={this.state.tmpRpc} onChange={this.handleRpcUrlChange.bind(this)} placeholder='请输入节点链接后点击确定按钮' />
                    <div className='Confirm' onClick={this.confirmRpcUrl.bind(this)}>确定</div>
                </div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>私钥：</div>
                    <input className="ModuleBg" type="text" value={this.state.privateKey} onChange={this.handlePrivateKeyChange.bind(this)} placeholder='请输入钱包私钥后点击确定按钮' />
                    <div className='Confirm' onClick={this.confirmPrivateKey.bind(this)}>确定</div>
                </div>
                <div className='LabelC Remark'>地址：{this.state.wallet.address}</div>
                <div className='LabelC Remark'>{this.state.chainSymbol}余额：{this.state.wallet.showBalance}</div>

                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.saleUrl} onChange={this.handleSaleUrlChange.bind(this)} placeholder='请输入预售链接获取预售信息' />
                    <div className='Confirm' onClick={this.confirmSaleUrl.bind(this)}>获取预售信息</div>
                </div>
                <div className='LabelC Remark'>预售合约：{this.state.saleInfo.saleAddress}</div>
                <div className='LabelC Remark'>开始时间：{this.state.saleInfo.startTime}</div>
                <div className='LabelC Remark'>结束时间：{this.state.saleInfo.endTime}</div>
                <div className='LabelC Remark'>代币合约：{this.state.saleInfo.tokenAddress}</div>
                <div className='LabelC Remark'>代币名称：{this.state.saleInfo.tokenName}</div>
                <div className='LabelC Remark'>代币符号：{this.state.saleInfo.tokenSymbol}</div>
                <div className='LabelC Remark'>创建者：{this.state.saleInfo.owner}</div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>抢购{this.state.chainSymbol}数量：</div>
                    <input className="ModuleBg" type="text" value={this.state.amountIn} onChange={this.handleAmountInChange.bind(this)} pattern="[0-9.]*" placeholder='请输入抢购数量' />
                </div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>gas倍数：</div>
                    <input className="ModuleBg" type="text" value={this.state.gasMulti} onChange={this.handleGasMultiChange.bind(this)} pattern="[0-9.]*" placeholder='输入gas倍数，默认1倍' />
                </div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>烧gas模式：</div>
                    <div className={this.getGasModeClass()} onClick={this.selGasMode.bind(this)}>
                        <div className=''>{this.state.gasMode ? '是' : '否'}</div>
                    </div>
                </div>

                <div className='ModuleTop flex mb20'>
                    <div className="approveUsdt" onClick={this.panicBuying.bind(this, false)}>抢购预售{this.state.saleInfo.tokenSymbol}</div>
                </div>
                {this.state.refreshStatus && <div className='Contract Remark mb20' onClick={this.clearCheckBuyInterval.bind(this)}>
                    预售抢购中...
                </div>}
            </div>
        );
    }
}

export default withNavigation(Presale);
import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import WalletState, { MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import Web3 from 'web3'
import { ERC20_ABI } from '../../abi/erc20';
import { Common_ABI } from '../../abi/Common_ABI';
import { SwapRouter_ABI } from '../../abi/SwapRouter_ABI';
import { VipSale_ABI } from '../../abi/VipSale_ABI';
import '../Token/Token.css'

import Header from '../Header';
import { showFromWei, toWei, showFromWeiMore, toWeiMore } from '../../utils';
import BN from 'bn.js'

class Swap extends Component {
    state = {
        chainId: '',
        account: '',
        //当前选择的链符号
        chain: WalletState.wallet.chain,
        //当前选择的链配置
        chainConfig: WalletState.wallet.chainConfig,
        //USDT代币详情
        USDTDetail: {},
        //输入框rpc
        tmpRpc: WalletState.wallet.chainConfig.RPC,
        //真正使用的rpc
        rpcUrl: WalletState.wallet.chainConfig.RPC,
        //私钥
        privateKey: null,
        //私钥对应的钱包信息
        wallet: {},
        //兑换的币种数组，一般是主币和USDT
        swapTokens: [],
        //当前选择的兑换代币，一般是主币或者USDT
        selectToken: WalletState.wallet.chainConfig.Tokens[0],
        //价值币数组，用于查价格或者代币滑点
        Tokens: WalletState.wallet.chainConfig.Tokens,
        //输入框代币合约地址
        tokenOut: null,
        //输入框代币合约对应的代币信息
        tokenOutInfo: {},
        //挂单价格
        priceInput: null,
        //交易数量
        amountIn: null,
        //交易滑点，默认20%
        slige: null,
        //gas倍数，默认1倍
        gasMulti: null,
        //路由
        swapRouter: WalletState.wallet.chainConfig.Dexs[0].SwapRouter,
        //检测Vip的Rpc
        CheckVipRpc: WalletState.configs.CheckVipRpc,
        //是否Vip
        isVip: false,
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
        this.clearRefreshTokenPriceInterval();
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
        let Tokens = chainConfig.Tokens;
        //链发生变化，一些配置信息要重置
        if (chainConfig.ChainId != this.state.chainConfig.chainId) {
            this.clearRefreshTokenPriceInterval();
            page.setState({
                chain: wallet.chain,
                chainConfig: chainConfig,
                tmpRpc: chainConfig.RPC,
                rpcUrl: chainConfig.RPC,
                swapRouter: chainConfig.Dexs[0].SwapRouter,
                Tokens: Tokens,
                selectToken: Tokens[0],
            })
        }

        //兑换币种
        let swapTokens = [];
        //查找USDT信息
        let USDTDetail;
        //主币和USDT放前面2位
        for (let i = 0; i < 2; i++) {
            let Token = Tokens[i];
            swapTokens.push(Token);
            if (Token.address == chainConfig.USDT) {
                USDTDetail = Token;
            }
        }
        this.setState({
            swapTokens: swapTokens,
            USDTDetail: USDTDetail,
        })

        //切换链后，重新获取钱包余额
        if (this.state.wallet.address) {
            //配置未更新，延迟请求
            setTimeout(() => {
                this.getWalletBalance(this.state.wallet);
            }, 100);
        }
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
        this.clearRefreshTokenPriceInterval();
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
                //USDT余额
                showUsdtBalance: 0,
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

    //获取钱包主币、USDT余额
    async getWalletBalance(wallet) {
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            //获取USDT余额
            const usdtContract = new myWeb3.eth.Contract(ERC20_ABI, this.state.chainConfig.USDT);
            let usdtBalance = await usdtContract.methods.balanceOf(wallet.address).call();
            let showUsdtBalance = showFromWei(usdtBalance, this.state.USDTDetail.decimals, 2);
            wallet.showUsdtBalance = showUsdtBalance;
            wallet.usdtBalance = new BN(usdtBalance, 10);
            //获取主币余额
            let balance = await myWeb3.eth.getBalance(wallet.address);
            let showBalance = showFromWei(balance, 18, 4);
            wallet.balance = new BN(balance, 10);
            wallet.showBalance = showBalance;
            let tokenOutInfo = this.state.tokenOutInfo;
            if (tokenOutInfo && tokenOutInfo.address) {
                //获取代币余额
                const tokenContract = new myWeb3.eth.Contract(ERC20_ABI, tokenOutInfo.address);
                let tokenBalance = await tokenContract.methods.balanceOf(wallet.address).call();
                let showTokenBalance = showFromWei(tokenBalance, tokenOutInfo.decimals, 4);
                wallet.tokenBalance = new BN(tokenBalance, 10);
                wallet.showTokenBalance = showTokenBalance;
            }
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

    //要购买的代币合约输入框变化
    handleTokenOutChange(event) {
        this.clearRefreshTokenPriceInterval();
        let value = event.target.value;
        this.setState({
            tokenOut: value,
            tokenOutDecimals: 0,
            tokenOutSymbol: null,
        })
    }

    //确定要购买的代币合约
    async confirmTokenOut() {
        let tokenAddress = this.state.tokenOut;
        if (!tokenAddress) {
            toast.show('请输入要购买的代币合约');
            return;
        }
        loading.show();
        try {
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            const commonContract = new myWeb3.eth.Contract(Common_ABI, this.state.chainConfig.Common);

            //获取要购买的代币信息
            let tokensInfo = await commonContract.methods.getTokenInfo(tokenAddress).call();
            let symbol = tokensInfo[0];
            let decimals = tokensInfo[1];
            let totalSupply = tokensInfo[2];

            let tokenOutInfo = {
                address: tokenAddress,
                symbol: symbol,
                decimals: decimals,
                totalSupply: totalSupply,
                showTotal: showFromWei(totalSupply, decimals, 2),
            }
            this.setState({
                tokenOutInfo: tokenOutInfo,
            })

            //获取价格
            let priceInfo = await this.getTokenPrice(tokenOutInfo);
            this.setState({
                tokenOutInfo: priceInfo,
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

    //获取其他价值币的合约地址，用于调用合约
    _getTokensAddress() {
        let Tokens = this.state.Tokens;
        let len = Tokens.length;
        let tokensAddress = [];
        for (let i = 0; i < len; i++) {
            tokensAddress.push(Tokens[i].address);
        }
        return tokensAddress;
    }

    //获取代币价格
    async getTokenPrice(tokenInfo) {
        let options = {
            timeout: 600000, // milliseconds,
            headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
        };
        const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
        const commonContract = new myWeb3.eth.Contract(Common_ABI, this.state.chainConfig.Common);
        //获取要购买的代币价格
        let tokens = this._getTokensAddress();
        let tokenPriceResult = await commonContract.methods.getTokenPrice(
            this.state.swapRouter,
            tokenInfo.address,
            WalletState.wallet.chainConfig.USDT,
            tokens
        ).call();
        console.log('tokenPriceResult', tokenPriceResult);
        //代币价格，需要处理USDT最小精度
        let tokenPrice = new BN(tokenPriceResult[0], 10);
        //价格的精度，本来就需要处理USDT的精度，这个精度是在USDT精度的基础上多的，还要再处理一遍
        //价格小于0.{17个0}x时，才存在这个精度
        let priceDecimals = parseInt(tokenPriceResult[1]);
        let pairOther = tokenPriceResult[2];
        let tokenReserve = tokenPriceResult[3];

        tokenInfo.tokenPrice = tokenPrice;
        tokenInfo.priceDecimals = priceDecimals;
        tokenInfo.pairOther = pairOther;
        tokenInfo.tokenReserve = tokenReserve;
        let realDecimals = this.state.USDTDetail.decimals + priceDecimals;
        tokenInfo.showTokenPrice = showFromWeiMore(tokenPrice, realDecimals, realDecimals);
        return tokenInfo;
    }

    //监听兑换支付数量输入框变化
    handleAmountInChange(event) {
        this.clearRefreshTokenPriceInterval();
        let value = this.state.amountIn;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ amountIn: value });
    }

    //监听挂单价格输入框变化
    handlePriceInputChange(event) {
        this.clearRefreshTokenPriceInterval();
        let value = this.state.priceInput;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ priceInput: value });
    }

    //监听滑点输入框变化
    handleSligeChange(event) {
        let value = this.state.slige;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ slige: value });
    }

    async approve(tokenAddress, e) {
        let wallet = this.state.wallet;
        if (!wallet || !wallet.privateKey) {
            toast.show("请先输入私钥导入钱包");
            return;
        }
        try {
            loading.show();
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            const tokenContract = new myWeb3.eth.Contract(ERC20_ABI, tokenAddress);
            let allowance = await tokenContract.methods.allowance(wallet.address, this.state.swapRouter).call();
            allowance = new BN(allowance, 10);
            if (!allowance.isZero()) {
                toast.show('已授权');
                return;
            }
            var gasPrice = await myWeb3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);

            var gas = await tokenContract.methods.approve(this.state.swapRouter, MAX_INT).estimateGas({ from: wallet.address });
            gas = new BN(gas, 10).mul(new BN("120", 10)).div(new BN("100", 10));

            //Data
            var data = tokenContract.methods.approve(this.state.swapRouter, new BN(MAX_INT, 10)).encodeABI();

            var nonce = await myWeb3.eth.getTransactionCount(wallet.address, "pending");

            var txParams = {
                gas: Web3.utils.toHex(gas),
                gasPrice: Web3.utils.toHex(gasPrice),
                nonce: Web3.utils.toHex(nonce),
                chainId: this.state.chainConfig.ChainId,
                value: Web3.utils.toHex("0"),
                to: tokenAddress,
                data: data,
                from: wallet.address,
            };

            var fee = new BN(gas, 10).mul(new BN(gasPrice, 10));

            console.log("txParams", txParams);

            //交易签名
            let privateKey = wallet.privateKey.trim();
            var signedTx = await myWeb3.eth.accounts.signTransaction(txParams, privateKey);
            console.log("signedTx", signedTx);
            let transaction = await myWeb3.eth.sendSignedTransaction(signedTx.rawTransaction);
            //交易失败
            if (!transaction.status) {
                toast.show("授权失败");
                return;
            }
            toast.show("已授权");
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //刷新价格
    _refreshTokenPriceIntervel = null;
    async refreshTokenPrice(refreshStatus) {
        this.clearRefreshTokenPriceInterval();
        if (!this.state.wallet.privateKey) {
            toast.show('请输入私钥导入钱包');
            return;
        }
        if (!this.state.isVip) {
            toast.show('仅限VIP使用');
            return;
        }
        if (!this.state.amountIn) {
            toast.show('请输入交易数量');
            return;
        }
        if (!this.state.tokenOutInfo || !this.state.tokenOutInfo.symbol) {
            toast.show('请输入代币合约地址后点击确定按钮');
            return;
        }
        if (!this.state.priceInput) {
            toast.show('请输入挂单价格');
            return;
        }
        let wallet = this.state.wallet;
        //使用之后，再刷新会员状态
        this.checkVip(wallet);
        if (refreshStatus == 'buy') {
            let selectToken = this.state.selectToken;
            if (selectToken.address == this.state.chainConfig.WETH) {
                //主币余额不足
                if (this.state.wallet.balance.lte(toWei(this.state.amountIn, selectToken.decimals))) {
                    toast.show(selectToken.Symbol + '余额不足');
                    return;
                }
            } else {
                //USDT余额不足
                if (this.state.wallet.usdtBalance.lt(toWei(this.state.amountIn, selectToken.decimals))) {
                    toast.show('USDT余额不足');
                    return;
                }
                await this.approve(this.state.USDTDetail.address);
            }
        } else if (refreshStatus == 'sell') {
            if (this.state.wallet.tokenBalance.lt(toWei(this.state.amountIn, this.state.tokenOutInfo.decimals))) {
                toast.show(this.state.tokenOutInfo.symbol + '余额不足');
                return;
            }
            await this.approve(this.state.tokenOutInfo.address);
        }
        this.setState({
            refreshStatus: refreshStatus,
        })
        this._refreshTokenPriceIntervel = setInterval(() => {
            this._refreshTokenPrice();
        }, 3000);
    }

    checking = false;
    //刷新代币价格
    async _refreshTokenPrice() {
        if (this.checking) {
            return;
        }
        this.checking = true;
        try {
            this.getWalletBalance(this.state.wallet);
            let tokenInfo = await this.getTokenPrice(this.state.tokenOutInfo);
            this.setState({
                tokenOutInfo: tokenInfo,
            })
            let price = toWeiMore(tokenInfo.showTokenPrice);
            if (price.isZero() && tokenInfo.priceDecimals == 0) {
                return;
            }
            let priceInput = toWeiMore(this.state.priceInput);
            console.log('priceInput', priceInput.toString());
            console.log('price', price.toString());
            if (this.state.refreshStatus == 'buy' && price.lte(priceInput)) {
                this.clearRefreshTokenPriceInterval();
                this._swap('buy');
            } else if (this.state.refreshStatus == 'sell' && price.gte(priceInput)) {
                this.clearRefreshTokenPriceInterval();
                this._swap('sell');
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            this.checking = false;
        }
    }

    clearRefreshTokenPriceInterval() {
        this.setState({ refreshStatus: null })
        if (this._refreshTokenPriceIntervel) {
            clearInterval(this._refreshTokenPriceIntervel);
            this._refreshTokenPriceIntervel = null;
        }
    }

    async _swap(buyOrSell) {
        try {
            loading.show();
            let options = {
                timeout: 600000, // milliseconds,
                headers: [{ name: 'Access-Control-Allow-Origin', value: '*' }]
            };

            let wallet = this.state.wallet;
            const myWeb3 = new Web3(new Web3.providers.HttpProvider(this.state.rpcUrl, options));
            const swapContract = new myWeb3.eth.Contract(SwapRouter_ABI, this.state.swapRouter);

            let amountIn;
            let path = [];
            //当前选择的交易币种
            let selectToken = this.state.selectToken;
            //当前代币合约信息
            let tokenOutInfo = this.state.tokenOutInfo;
            if (buyOrSell == 'buy') {
                //输入
                amountIn = toWei(this.state.amountIn, selectToken.decimals);
                //路径
                path.push(selectToken.address);
                if (tokenOutInfo.pairOther != selectToken.address) {
                    path.push(tokenOutInfo.pairOther);
                }
                path.push(tokenOutInfo.address);
            } else {//sell
                //输入
                amountIn = toWei(this.state.amountIn, tokenOutInfo.decimals);
                //路径
                path.push(tokenOutInfo.address);
                if (tokenOutInfo.pairOther != selectToken.address) {
                    path.push(tokenOutInfo.pairOther);
                }
                path.push(selectToken.address);
            }

            //预估能得到多少代币
            let amountOuts = await swapContract.methods.getAmountsOut(amountIn, path).call();
            let amountOut = new BN(amountOuts[amountOuts.length - 1], 10);
            //滑点
            let slige = this.state.slige;
            if (!slige) {
                slige = '20';
            }
            slige = parseInt(parseFloat(slige) * 100);
            //根据滑点计算得到的最小值
            let amountOutMin = amountOut.mul(new BN(10000 - slige)).div(new BN(10000));

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

            //Data
            let data;
            if (buyOrSell == 'buy') {
                //主币购买
                if (selectToken.address == this.state.chainConfig.WETH) {
                    data = swapContract.methods.swapExactETHForTokensSupportingFeeOnTransferTokens(
                        amountOutMin, path, wallet.address, 1914823077
                    ).encodeABI();
                } else {
                    data = swapContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        amountIn, amountOutMin, path, wallet.address, 1914823077
                    ).encodeABI();
                }
            } else {
                //卖得主币
                if (selectToken.address == this.state.chainConfig.WETH) {
                    data = swapContract.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(
                        amountIn, amountOutMin, path, wallet.address, 1914823077
                    ).encodeABI();
                } else {
                    data = swapContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        amountIn, amountOutMin, path, wallet.address, 1914823077
                    ).encodeABI();
                }
            }

            var nonce = await myWeb3.eth.getTransactionCount(wallet.address, "pending");
            console.log("nonce", nonce);

            let gas;
            if (buyOrSell == 'buy') {
                //主币购买
                if (selectToken.address == this.state.chainConfig.WETH) {
                    gas = await swapContract.methods.swapExactETHForTokensSupportingFeeOnTransferTokens(
                        amountOutMin, path, wallet.address, 1914823077
                    ).estimateGas({ from: wallet.address, value: amountIn });
                } else {
                    gas = await swapContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        amountIn, amountOutMin, path, wallet.address, 1914823077
                    ).estimateGas({ from: wallet.address });
                }
            } else {
                //卖得主币
                if (selectToken.address == this.state.chainConfig.WETH) {
                    gas = await swapContract.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(
                        amountIn, amountOutMin, path, wallet.address, 1914823077
                    ).estimateGas({ from: wallet.address });
                } else {
                    gas = await swapContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        amountIn, amountOutMin, path, wallet.address, 1914823077
                    ).estimateGas({ from: wallet.address });
                }
            }
            gas = new BN(gas, 10).mul(new BN("150", 10)).div(new BN("100", 10));

            let value = '0';
            if (buyOrSell == 'buy' && selectToken.address == this.state.chainConfig.WETH) {
                value = amountIn;
            }

            var txParams = {
                gas: Web3.utils.toHex(gas),
                gasPrice: Web3.utils.toHex(gasPrice),
                nonce: Web3.utils.toHex(nonce),
                chainId: this.state.chainConfig.ChainId,
                value: Web3.utils.toHex(value),
                to: this.state.swapRouter,
                data: data,
                from: wallet.address,
            };

            var fee = new BN(gas, 10).mul(new BN(gasPrice, 10));
            console.log("fee", Web3.utils.fromWei(fee, "ether"));

            //交易签名
            let privateKey = wallet.privateKey;
            var signedTx = await myWeb3.eth.accounts.signTransaction(txParams, privateKey);
            console.log("signedTx", signedTx);
            console.log("txParams", txParams);
            let transaction = await myWeb3.eth.sendSignedTransaction(signedTx.rawTransaction);
            // 交易失败
            if (!transaction.status) {
                toast.show("交易失败");
                return;
            }
            console.log("交易成功");
            toast.show("交易成功");
            this.getWalletBalance(wallet);
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    handleGasMultiChange(event) {
        let value = this.state.gasMulti;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ gasMulti: value });
    }

    //选择链
    selChain(index, e) {
        this.clearRefreshTokenPriceInterval();
        WalletState.changeChain(WalletState.configs.chains[index]);
    }

    //链选择样式
    getChainItemClass(item) {
        if (item == this.state.chainConfig.chain) {
            return 'Token-Item Item-Sel';
        }
        return 'Token-Item Item-Nor';
    }

    //选择交易所
    selDex(index, e) {
        this.clearRefreshTokenPriceInterval();
        this.setState({
            swapRouter: this.state.chainConfig.Dexs[index].SwapRouter,
        })
    }

    //链选择样式
    getDexItemClass(item) {
        if (item.SwapRouter == this.state.swapRouter) {
            return 'Token-Item Item-Sel';
        }
        return 'Token-Item Item-Nor';
    }

    //选择交易币种
    selToken(index, e) {
        this.clearRefreshTokenPriceInterval();
        this.setState({
            selectToken: this.state.Tokens[index],
        })
    }

    //交易币种样式
    getTokenItemClass(item) {
        if (item.address == this.state.selectToken.address) {
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
                        WalletState.configs.chains.map((item, index) => {
                            return <div key={index} className={this.getChainItemClass(item)} onClick={this.selChain.bind(this, index)}>
                                <div className=''>{item}</div>
                            </div>
                        })
                    }
                </div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>交易所：</div>
                    {
                        this.state.chainConfig.Dexs.map((item, index) => {
                            return <div key={index} className={this.getDexItemClass(item)} onClick={this.selDex.bind(this, index)}>
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
                <div className='LabelC Remark'>{this.state.chainConfig.Symbol}余额：{this.state.wallet.showBalance}</div>
                <div className='LabelC Remark'>{this.state.USDTDetail.Symbol}余额：{this.state.wallet.showUsdtBalance}</div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>币种：</div>
                    {
                        this.state.swapTokens.map((item, index) => {
                            return <div key={index} className={this.getTokenItemClass(item)} onClick={this.selToken.bind(this, index)}>
                                <div className=''>{item.Symbol}</div>
                            </div>
                        })
                    }
                </div>


                <div className='flex TokenAddress ModuleTop'>
                    <input className="ModuleBg" type="text" value={this.state.tokenOut} onChange={this.handleTokenOutChange.bind(this)} placeholder='请输入代币合约后点击确定按钮' />
                    <div className='Confirm' onClick={this.confirmTokenOut.bind(this)}>确定</div>
                </div>
                <div className='LabelC Remark'>代币符号：{this.state.tokenOutInfo.symbol}， 精度：{this.state.tokenOutInfo.decimals}</div>
                <div className='LabelC Remark'>代币价格：{this.state.tokenOutInfo.showTokenPrice} {this.state.USDTDetail.Symbol}</div>
                <div className='LabelC Remark'>钱包余额：{this.state.wallet.showTokenBalance} {this.state.tokenOutInfo.symbol}</div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>价格：</div>
                    <input className="ModuleBg" type="text" value={this.state.priceInput} onChange={this.handlePriceInputChange.bind(this)} pattern="[0-9.]*" placeholder='请输入挂单价格' />
                </div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>数量：</div>
                    <input className="ModuleBg" type="text" value={this.state.amountIn} onChange={this.handleAmountInChange.bind(this)} pattern="[0-9.]*" placeholder='请输入交易数量' />
                </div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>滑点：</div>
                    <input className="ModuleBg" type="text" value={this.state.slige} onChange={this.handleSligeChange.bind(this)} pattern="[0-9.]*" placeholder='请输入交易滑点，默认20%' />
                    %
                </div>

                <div className='flex TokenAddress ModuleTop'>
                    <div className='Remark'>速度：</div>
                    <input className="ModuleBg" type="text" value={this.state.gasMulti} onChange={this.handleGasMultiChange.bind(this)} pattern="[0-9.]*" placeholder='输入gas倍数，最少1倍' />
                </div>

                <div className='ModuleTop flex'>
                    <div className="approveUsdt" onClick={this.approve.bind(this, this.state.USDTDetail.address)}>授权USDT</div>
                    <div className="approveToken" onClick={this.approve.bind(this, this.state.tokenOutInfo.address)}>授权{this.state.tokenOutInfo.symbol}代币</div>
                </div>

                <div className='ModuleTop flex mb20'>
                    <div className="approveUsdt" onClick={this.refreshTokenPrice.bind(this, 'buy')}>挂单买入{this.state.tokenOutInfo.symbol}</div>
                    <div className="approveToken" onClick={this.refreshTokenPrice.bind(this, 'sell')}>挂单卖出{this.state.tokenOutInfo.symbol}</div>
                </div>
                {this.state.refreshStatus && <div className='Contract Remark mb20' onClick={this.clearRefreshTokenPriceInterval.bind(this)}>
                    挂单交易中...
                </div>}
            </div>
        );
    }
}

export default withNavigation(Swap);
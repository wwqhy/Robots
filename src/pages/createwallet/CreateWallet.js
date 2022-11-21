import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import Web3 from 'web3'
import loading from '../../components/loading/Loading';
import toast from '../../components/toast/toast';
import "../ImportVip/ImportVip.css"
import '../Token/Token.css'
import { CSVLink, CSVDownload } from "react-csv";
import Header from '../Header';
import { ethers } from 'ethers';

class CreateWallet extends Component {
    state = {
        num: "",
        wallets: [],
        address: []
    }

    constructor(props) {
        super(props);
        this.createWallet = this.createWallet.bind(this);
        this.handleNumChange = this.handleNumChange.bind(this);
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    filename() {
        var time = new Date().format("yyyy-MM-dd-HH-mm-ss", "en");
        return "wallets-" + time + ".csv";
    }

    handleNumChange(event) {
        let value = this.state.num;
        if (event.target.validity.valid) {
            value = event.target.value;
        }
        this.setState({ num: value });
    }

    async createWallet() {
        if (!this.state.num) {
            toast.show("请输入要创建的钱包数量");
            return;
        }
        loading.show();
        let num = parseInt(this.state.num);
        setTimeout(() => {
            this._createWallet(num);
        }, 30);
    }

    async _createWallet(num) {
        let walletList = [];
        let addressList = [];
        try {
            for (let i = 0; i < num; i++) {
                //拿到生成的钱包对象
                let wallet = ethers.Wallet.createRandom();
                console.log("wallet：", wallet)
                //获取助记词对象
                let mnemonic = wallet.mnemonic;
                //助记词
                let phrase = mnemonic.phrase;
                //获取钱包的私钥
                let privateKey = wallet.privateKey;
                //获取钱包地址
                let address = wallet.address;
                walletList.push({ mnemonic: phrase, privateKey: privateKey, address: address });
                addressList.push({ address: address });
            }
            this.setState({ wallets: walletList, address: addressList });
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    render() {
        return (
            <div className="Token ImportVip">
                <Header></Header>
                <input className="ModuleBg ModuleTop Contract" type="text" value={this.state.num} onChange={this.handleNumChange} pattern="[0-9]*" placeholder='输入创建钱包数量' />

                <div className="button ModuleTop" onClick={this.createWallet}>
                    创建钱包
                </div>

                <CSVLink className="button ModuleTop" data={this.state.wallets} filename={this.filename}>
                    导出钱包
                </CSVLink>
                <CSVLink className="button ModuleTop" data={this.state.address} filename={this.filename}>
                    导出地址
                </CSVLink>
                {
                    this.state.wallets.map((item, index) => {
                        return <div key={index} className="mt15 Item column">
                            <div className='text'>{index + 1}. 助记词：{item.mnemonic}</div>
                            <div className='text mt5 ml15'>私钥：{item.privateKey}</div>
                            <div className='text mt5 ml15'>地址：{item.address}</div>
                        </div>
                    })
                }
            </div>
        );
    }
}

export default withNavigation(CreateWallet);
import React, { Component } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { withNavigation } from './hocs';
import toast from './components/toast/toast';

class Tabs extends Component {

    state = {
        selectIndex: 0
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.setSelTab();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        setTimeout(() => {
            this.setSelTab();
        }, 16);
    }

    setSelTab() {
        let index = 4;
        let pathname = window.location.pathname;
          if ("/vip" == pathname) {
            index = 1;
        } else if ('/multiSend' == pathname) {
            index = 2;
        }else if ('/panicBuying' == pathname) {
            index = 3;
        } else if ('/' == pathname) {
            index = 0;
        }
        if (this.state.selectIndex == index) {
            return;
        }
        this.setState({ selectIndex: index });
    }

    getTabStyle(index) {
        if (this.state.selectIndex == index) {
            return "tab-item sel";
        }
        return "tab-item nor"
    }

    showComing() {
        toast.show("即将开放，敬请期待");
    }

    routerTo(path, e) {
        this.setState({ show: false })
        this.props.navigate(path);
    }

    render() {
        return (
            <div className="tab">
                <div className={this.getTabStyle(0)} onClick={this.routerTo.bind(this, '/')}>
                    <div>挂单模式</div>
                </div>
                <div className={this.getTabStyle(1)} onClick={this.routerTo.bind(this, '/vip')}>
                    <div>VIP</div>
                </div>
                <div className={this.getTabStyle(2)} onClick={this.routerTo.bind(this, '/multiSend')}>
                    <div>批量转账</div>
                </div>
                <div className={this.getTabStyle(3)} onClick={this.routerTo.bind(this, '/panicBuying')}>
                    <div>抢购模式</div>
                </div>
                <div className={this.getTabStyle(4)} onClick={this.routerTo.bind(this, '/more')}>
                    <div>更多</div>
                </div>
            </div>
        );
    }
}

export default withNavigation(Tabs);
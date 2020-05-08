

// 订阅者
class Watcher {
    constructor (vm, expr, cb) {
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        // 获取旧值
        this.oldVal = this.getOldVal();
    }
    getOldVal () {
        Dep.target = this;
        const oldVal = compileUtil.getValue(this.expr, this.vm);
        Dep.target = null;
        return oldVal;
    }
    update () {
        // 判断新值和旧值是否有变化
        const newVal = compileUtil.getValue(this.expr, this.vm);
        if(newVal !== this.oldVal) {
            this.cb(newVal)
        }
    }
}
class Dep {
    // 收集 + 通知
    constructor () {
        this.subs = [];
    }
    // 收集观察者
    addSub (watcher) {
        this.subs.push(watcher);
    }
    // 通知观察者去更新
    notify () {
        console.log('通知观察者', this.subs)
        this.subs.forEach( w => w.update());
    }
}


// Publisher 发布者
class Observer{
    constructor (data) {
        this.observe(data);
    }
    observe (data) {
        /** 
         {
            persion: {
                name: 'fanke'
                fav：{
                    a: 'ball'
                }
            }
         }
         */
        if(data && typeof data === 'object') {
            // 对data进行数据劫持
            Object.keys(data).forEach( key => {
                this.defineReactive(data, key, data[key])
            })
        }
    }
    defineReactive (data, key, value) {
        const _this = this;
        // 递归遍历
        this.observe(value);
        const dep = new Dep(); // 数据依赖器 每个属性维护一个Dep，记录自己的订阅者(即watcher)，notify通知每个订阅者执行相应的update方法，更新视图
        Object.defineProperty(data, key, {
            enumerable: true,    // 可枚举
            configurable: false, // 不能再define
            get() {
                // 订阅数据变化时，往Dep中去添加订阅者
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set (newValue) {
                _this.observe(newValue);
                if(newValue !== value) {
                    value = newValue;
                    // 通知数据依赖器dep，进而dep去通知订阅者做出更新
                    dep.notify();
                }
            }
        })
    }
}
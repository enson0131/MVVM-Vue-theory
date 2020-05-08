  ## 前言
  随着Vue的火热发展，越来越多的程序员并不满足于对框架的使用，更多地追求其内在的原理，就像不能沉沦于美丽的外表，更应该追求灵魂的高度。

  ## 正文
  好了，废话不多说，接下来我们将通过俩方面开展我们对外在的追求，哦不，内在的追求。
  1 了解vue双向数据绑定原理
  2 了解原理后，对有趣的灵魂进行一波塑造，简单实现一个MVVM框架

  #### Vue实现双向数据绑定的做法
  vue.js 是采用数据劫持结合发布者-订阅者模式的方式，通过Object.defineProperty()来劫持各个属性的setter，getter，在数据变动时发布消息给订阅者，触发相应的监听回调。

  #### 塑造有趣的灵魂
  好了，我们了解了vue双向数据后，接下来就是实现一个简单的MVVM框架，既然我们知道vue是通过数据劫持结合发布者-订阅者模式实现的，那我们可以通过:
  1、实现一个数据监听器Observer，能够对数据对象的所有属性进行监听，如有变动可拿到最新值并通知订阅者
  2、实现一个指令解析器Compile，对每个元素节点的指令进行扫描和解析，根据指令模板替换数据，以及绑定相应的更新函数
  3、实现一个Watcher，作为连接Observer和Compile的桥梁，能够订阅并收到每个属性变动的通知，执行指令绑定的相应回调函数，从而更新视图
  4、实现一个MVVM入口类，对数据进行劫持的入口

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200508164531242.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2NoZW5fZW5zb25fMQ==,size_16,color_FFFFFF,t_70)

1 实现一个MVVM入口类
先实现入口类，统一入口，进而通过获取的数据进行数据劫持和指令解析

```javascript
class mVue {
    constructor (options) {
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        if (this.$el) {
            // 1. 实现了一个数据观察者
            new Observer(this.$data);
            // 2. 实现一个指令解析器
            new Compile(this.$el, this);
        }
    }
}
```
2 实现一个数据监听器Observer类
实例化Observer类，通过递归调用observe方法，获取data的每一个对象数据的值，并通过Object.defineProperty对数据的get/set进行劫持，在defineReactive 方法中通过闭包的方式创建数据依赖器Dep，每个属性维护一个Dep，记录自己的订阅者(即watcher)，notify通知每个订阅者执行相应的update方法，更新视图
那么问题来了？ Dep要如何去记录自己的订阅者呢？
很简单，维护一个数组subs，用来收集订阅者watcher，数据变动触发notify，再调用订阅者的update方法
```javascript
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
```

```javascript
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
```

3  实现一个Watcher
Watcher订阅者作为Observer和Compile之间通信的桥梁，主要做的事情是: 
a、在自身实例化时往属性订阅器(dep)里面添加自己
b、自身必须有一个update()方法
c、待属性变动dep.notify ()通知时，能调用自身的update()方法，并触发Compile中绑定的回调函数cb，则功成身退

```javascript
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
```

4 实现一个指令解析器Compile
compile主要做的事情是解析模板指令（例如v-html，v-text），将模板中的变量替换成数据，然后初始化渲染页面视图，并将每个指令对应的节点绑定更新函数，添加监听数据的订阅者，一旦数据有变动，收到通知，进而更新视图

```javascript
class Compile {
    constructor(el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector(el);
        this.vm = vm;
        // 获取文档碎片对象，放入内存中会减少页面的回流和重绘
        const fragment = this.node2Fragment(this.el);
        // console.log(fragment)

        // 编译模板
        this.compile(fragment);

        // 追加子元素到根元素上
        this.el.appendChild(fragment);
    }
    compile (fragment) {
        // 1 获取子节点
        const childNodes = fragment.childNodes;
        [...childNodes].forEach( child => {
            // console.log(child);
            if (this.isElementNode(child)) {
                // 是元素节点
                // 编译元素节点
                // console.log('元素节点', child)
                this.compileElement(child)
            }else {
                // 文本节点
                // console.log('文本节点', child)
                this.compileText(child)
            }

            if (child.childNodes && child.childNodes.length) {
                this.compile(child);
            }
        })
    }
    compileElement (node) {
        // <div v-text="msg"></div>
        const attributes = node.attributes;
        // console.log(attributes); 
        [...attributes].forEach(attr => {
            const {name, value} = attr; // name=v-text | value = msg || name=@click value=handleClick
            // console.log(name);
            if (this.isDirective(name)) { // 是指令 v-text v-model v-html v-on:click
                const [, directive] = name.split("-"); // text, model, html, on:click
                const [dirName, eventName] = directive.split(":"); // dirName -> text, model, html, on
                // 更新数据 数据驱动视图
                compileUtil[dirName](node, value, this.vm, eventName);
                // 删除有指令的标签上的属性
                node.removeAttribute('v-' + directive)
            }else if(this.isEventDirective(name)){ // 判断是否是@等监听事件
                const [, eventName] = name.split("@"); // eventDirective = click
                compileUtil['on'](node, value, this.vm, eventName);
                // 删除有指令的标签上的属性
                node.removeAttribute('@' + eventName)
            }
        })
    }
    compileText (node) {
        // 编译 {{}}
        const content = node.textContent;
        // console.log("content", content);
        if(/\{\{(.+?)\}\}/.test(content)){
            // console.log(content);
            compileUtil['text'](node, content, this.vm);
        }
    }
    // 判断是否是Vue的指令
    isDirective (attrName) {
        return attrName.startsWith("v-")
    }
    // 判断指令是否是事件 
    isEventDirective (attrName) {
        return attrName.startsWith("@")
    }
    // 判断是否是节点
    isElementNode (node) {
        return node.nodeType === 1;
    }
    node2Fragment (el) {
        // 创建文档碎片对象
        const f = document.createDocumentFragment();
        let firstChild;
        while (firstChild = el.firstChild) {
            f.append(firstChild);
        }
        return f;
    }
}
```

## 总结
好了，这样我们就大概塑造了一个有趣的灵魂了，这时候可能会有一些同学会有一些有趣的问题，例如：
1 发布订阅模式为何和观察者模式如此相似？
这里简单说一下俩者的区别：
a 观察者模式里，只有两个角色 —— 观察者 + 被观察者，发布订阅模式里存在着第三个中介
b 观察者和被观察者，是松耦合的关系。 发布者和订阅者，则完全不存在耦合

2 如何查看完整的代码?
请猛戳[这里](https://github.com/10047141/MVVM-Vue-theory)


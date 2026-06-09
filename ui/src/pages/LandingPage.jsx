{/* Landing Page */}

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView, animate } from 'framer-motion'

const Ico = {
  arrow:   (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  arrowDiag:(s=12)=> <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg>,
  zap:     (c,s=13)=><svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  brain:   (c,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.1-1.98Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.1-1.98Z"/></svg>,
  db:      (c,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
  shield:  (c,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  globe:   (c,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  layers:  (c,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  refresh: (c,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  network: (c,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>,
  github:  (s=15)  =><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>,
}

const STEPS = [
  { label:'Query Analyser',   icon:'brain',   color:'#7c5cfc', desc:'Rewrite · decompose · classify' },
  { label:'Hybrid Retriever', icon:'db',      color:'#2563eb', desc:'FAISS + BM25 via RRF' },
  { label:'Relevance Critic', icon:'shield',  color:'#ef4444', desc:'Score chunks 0–1' },
  { label:'Web Fallback',     icon:'globe',   color:'#f59e0b', desc:'Tavily real-time search' },
  { label:'Cross-Encoder',    icon:'layers',  color:'#10b981', desc:'Re-rank top candidates' },
  { label:'Answer Generator', icon:'layers',  color:'#059669', desc:'LLM + curated context' },
  { label:'Answer Critic',    icon:'refresh', color:'#ef4444', desc:'Hallucination detection' },
  { label:'Memory Graph',     icon:'network', color:'#8b5cf6', desc:'Persist entities + edges' },
]

const MQ_TOP = [
  {label:'Self-Critiquing RAG'},{label:'FAISS Vector Search'},{label:'BM25 Keyword Match'},
  {label:'Reciprocal Rank Fusion'},{label:'ms-marco Cross-Encoder'},{label:'Tavily Web Fallback'},
  {label:'LangGraph State Machine'},{label:'NetworkX Memory Graph'},{label:'RAGAS Evaluation'},
]
const MQ_BOT = [
  {label:'Self-RAG',val:'Asai 2023'},{label:'CRAG',val:'Yan 2024'},{label:'GraphRAG',val:'Edge 2024'},
  {label:'Faithfulness',val:'+46%'},{label:'Relevancy',val:'+26%'},{label:'Precision',val:'+45%'},
  {label:'Recall',val:'+38%'},{label:'8 Pipeline Nodes'},{label:'2 Critique Loops'},
]
const ARCH = [
  {nodes:[{l:'User Query',c:'#111',w:160}],first:true},
  {nodes:[{l:'Query Analyser',c:'#7c5cfc',d:'rewrite · decompose · classify'}]},
  {nodes:[{l:'FAISS Vector',c:'#2563eb',d:'semantic'},{l:'BM25 Retriever',c:'#2563eb',d:'keyword'},{l:'Memory Graph',c:'#8b5cf6',d:'history'}]},
  {nodes:[{l:'Relevance Critic',c:'#ef4444',d:'score 0–1 per chunk',badge:'CRITIQUE LOOP 1'}]},
  {split:true,left:{l:'Sufficient ✓',c:'#059669'},right:{l:'Insufficient → Web Fallback',c:'#f59e0b'}},
  {nodes:[{l:'Cross-Encoder Re-ranker',c:'#10b981',d:'ms-marco-MiniLM'}]},
  {nodes:[{l:'Answer Generator',c:'#059669',d:'LLM + curated context window'}]},
  {nodes:[{l:'Answer Critic',c:'#ef4444',d:'faithfulness · completeness · confidence',badge:'CRITIQUE LOOP 2'}]},
  {nodes:[{l:'Memory Updater → Graph Store',c:'#8b5cf6',d:'entities + relations persisted'}]},
  {nodes:[{l:'Final Response + Citations',c:'#111',w:300}],last:true},
]

function CountUp({to,suffix='',duration=1.4}){
  const ref=useRef(null),inView=useInView(ref,{once:true,margin:'-30px'}),[val,setVal]=useState(0)
  useEffect(()=>{
    if(!inView)return
    const isF=String(to).includes('.')
    const c=animate(0,to,{duration,ease:[0.16,1,0.3,1],onUpdate(v){setVal(isF?parseFloat(v.toFixed(2)):Math.round(v))}})
    return c.stop
  },[inView,to,duration])
  return <span ref={ref}>{val}{suffix}</span>
}

const FadeUp=({children,delay=0,style={}})=>{
  const ref=useRef(null),inView=useInView(ref,{once:true,margin:'-40px'})
  return(
    <motion.div ref={ref} initial={{opacity:0,y:24}} animate={inView?{opacity:1,y:0}:{}}
      transition={{duration:.7,delay,ease:[0.16,1,0.3,1]}} style={style}>
      {children}
    </motion.div>
  )
}

function Marquee({items,speed=28,reverse=false}){
  const content=[...items,...items,...items]
  return(
    <div style={{overflow:'hidden',display:'flex',userSelect:'none'}}>
      <motion.div
        animate={{x:reverse?['-33.33%','0%']:['0%','-33.33%']}}
        transition={{duration:speed,repeat:Infinity,ease:'linear'}}
        style={{display:'flex',willChange:'transform'}}
      >
        {content.map((item,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'0 28px',flexShrink:0,borderRight:'1px solid rgba(0,0,0,.06)'}}>
            <span style={{fontSize:11,fontWeight:600,color:'#888',letterSpacing:'.06em',whiteSpace:'nowrap',textTransform:'uppercase',fontFamily:'monospace'}}>{item.label}</span>
            {item.val&&<span style={{fontSize:10,fontFamily:'monospace',color:'#10b981',fontWeight:700}}>{item.val}</span>}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

function PipelineViz(){
  const [active,setActive]=useState(0)
  useEffect(()=>{const t=setInterval(()=>setActive(p=>(p+1)%STEPS.length),1600);return()=>clearInterval(t)},[])
  return(
    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
      {STEPS.map((s,i)=>{
        const isA=active===i,isP=i<active
        return(
          <motion.div key={s.label}
            animate={{opacity:isP?.26:isA?1:.5,scale:isA?1.02:1}}
            transition={{duration:.2}}
            style={{display:'flex',alignItems:'center',gap:6,padding:'6px 11px',borderRadius:8,
              background:isA?`${s.color}12`:'rgba(0,0,0,.025)',
              border:`1px solid ${isA?s.color+'35':'rgba(0,0,0,.07)'}`,cursor:'default'}}
          >
            {Ico[s.icon](isA?s.color:'#bbb',11)}
            <div>
              <div style={{fontSize:10.5,fontWeight:600,color:isA?s.color:'#999',letterSpacing:'-.01em',lineHeight:1.2}}>{s.label}</div>
              {isA&&<motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.2}} style={{fontSize:9,color:'#bbb',fontFamily:'monospace',marginTop:1.5}}>{s.desc}</motion.div>}
            </div>
            {isA&&<motion.div animate={{scale:[1,1.9,1],opacity:[1,.3,1]}} transition={{repeat:Infinity,duration:1.1}} style={{width:4,height:4,borderRadius:'50%',background:s.color,marginLeft:2,flexShrink:0}}/>}
          </motion.div>
        )
      })}
    </div>
  )
}

function MetricCard({label,baseline,adaptive,color,delay}){
  const pct=(((adaptive-baseline)/baseline)*100).toFixed(1)
  const ref=useRef(null),inView=useInView(ref,{once:true,margin:'-30px'})
  return(
    <FadeUp delay={delay}>
      <motion.div ref={ref} whileHover={{y:-4}}
        style={{background:'#fff',border:'1px solid #eaeae6',borderRadius:16,padding:'22px',transition:'border-color .2s,box-shadow .2s'}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=color+'55';e.currentTarget.style.boxShadow=`0 8px 32px ${color}16`}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='#eaeae6';e.currentTarget.style.boxShadow='none'}}
      >
        <div style={{fontSize:9,color:'#bbb',fontFamily:'monospace',marginBottom:16,letterSpacing:'.07em',textTransform:'uppercase'}}>{label}</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:14}}>
          <div>
            <div style={{fontSize:8.5,color:'#ddd',marginBottom:4,letterSpacing:'.04em',fontFamily:'monospace'}}>BASELINE</div>
            <div style={{fontSize:30,fontWeight:900,color:'#ddd',letterSpacing:'-.06em',lineHeight:1}}>{inView?<CountUp to={baseline} duration={1}/>:'0'}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:8.5,color:'#bbb',marginBottom:4,letterSpacing:'.04em',fontFamily:'monospace'}}>ADAPTIVE</div>
            <div style={{fontSize:30,fontWeight:900,color,letterSpacing:'-.06em',lineHeight:1}}>{inView?<CountUp to={adaptive} duration={1.4}/>:'0'}</div>
          </div>
        </div>
        <div style={{height:2.5,background:'#f0f0ee',borderRadius:3,overflow:'hidden',marginBottom:10}}>
          <motion.div initial={{width:0}} animate={inView?{width:`${adaptive*100}%`}:{}} transition={{duration:1.3,delay:.1,ease:[0.16,1,0.3,1]}} style={{height:'100%',borderRadius:3,background:color}}/>
        </div>
        <div style={{fontSize:11,color,fontFamily:'monospace',fontWeight:700}}>+{pct}% improvement</div>
      </motion.div>
    </FadeUp>
  )
}

function FeatureCard({iconKey,title,desc,color,delay,number}){
  const [hov,setHov]=useState(false)
  return(
    <FadeUp delay={delay}>
      <motion.div whileHover={{y:-5}} onHoverStart={()=>setHov(true)} onHoverEnd={()=>setHov(false)}
        style={{background:hov?`${color}07`:'#fff',border:`1px solid ${hov?color+'28':'#eaeae6'}`,
          borderRadius:18,padding:'26px 24px',height:'100%',
          boxShadow:hov?`0 16px 48px ${color}18`:'none',
          transition:'all .28s cubic-bezier(0.16,1,0.3,1)',cursor:'default',position:'relative',overflow:'hidden'}}
      >
        <div style={{position:'absolute',top:14,right:18,fontSize:58,fontWeight:900,color:`${color}07`,lineHeight:1,letterSpacing:'-.05em',pointerEvents:'none',fontFamily:'monospace'}}>{String(number).padStart(2,'0')}</div>
        <div style={{width:40,height:40,borderRadius:11,background:`${color}0f`,border:`1px solid ${color}20`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:18,transform:hov?'scale(1.1) rotate(-4deg)':'none',transition:'transform .28s'}}>
          {Ico[iconKey](color,18)}
        </div>
        <div style={{fontSize:14.5,fontWeight:700,color:'#111',marginBottom:8,letterSpacing:'-.025em'}}>{title}</div>
        <div style={{fontSize:13,color:'#777',lineHeight:1.74}}>{desc}</div>
      </motion.div>
    </FadeUp>
  )
}

function PaperCard({title,authors,year,tag,tagColor,desc,delay}){
  const tc={purple:{bg:'#f3f0ff',text:'#6d28d9'},amber:{bg:'#fffbeb',text:'#b45309'},teal:{bg:'#f0fdf9',text:'#0f766e'}}
  const c=tc[tagColor]||tc.purple
  return(
    <FadeUp delay={delay}>
      <motion.div whileHover={{y:-4}}
        style={{background:'#fff',border:'1px solid #eaeae6',borderRadius:18,padding:'26px',height:'100%',transition:'border-color .2s,box-shadow .2s'}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='#c8c8c2';e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,.07)'}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='#eaeae6';e.currentTarget.style.boxShadow='none'}}
      >
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <span style={{fontSize:10.5,fontWeight:700,letterSpacing:'.04em',textTransform:'uppercase',padding:'4px 10px',borderRadius:6,background:c.bg,color:c.text}}>{tag}</span>
          <span style={{fontSize:10,color:'#ccc',fontFamily:'monospace'}}>{year}</span>
        </div>
        <div style={{fontSize:14,fontWeight:700,color:'#111',marginBottom:8,lineHeight:1.44,letterSpacing:'-.022em'}}>{title}</div>
        <div style={{fontSize:11,color:'#ccc',marginBottom:14,fontFamily:'monospace'}}>{authors}</div>
        <div style={{fontSize:13,color:'#777',lineHeight:1.74}}>{desc}</div>
      </motion.div>
    </FadeUp>
  )
}

export default function LandingPage(){
  const heroRef=useRef(null)
  const {scrollYProgress}=useScroll({target:heroRef,offset:['start start','end start']})
  const heroOpac=useTransform(scrollYProgress,[0,.7],[1,0])

  const [typed,setTyped]=useState('')
  const full='What are the key findings from the latest RAG research?'
  useEffect(()=>{
    let i=0
    const t=setInterval(()=>{setTyped(full.slice(0,i));i++;if(i>full.length)clearInterval(t)},44)
    return()=>clearInterval(t)
  },[])

  return(
    <div style={{minHeight:'100vh',background:'#f8f8f6',fontFamily:"'Helvetica Neue',Helvetica,Arial,sans-serif"}}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}
        @keyframes float-orb{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-18px) scale(1.04)}}
        *{box-sizing:border-box}
        ::selection{background:rgba(37,99,235,.14)}
        html{scroll-behavior:smooth}
        @media(max-width:960px){
          .hs{flex-direction:column!important;padding:0 24px!important}
          .hr{margin-top:48px!important;width:100%!important}
          .hh{font-size:52px!important}
          .sg{grid-template-columns:repeat(2,1fr)!important}
        }
        @media(max-width:600px){
          .hh{font-size:40px!important}
          .fg{grid-template-columns:1fr!important}
          .hsm{display:none!important}
        }
      `}</style>

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section ref={heroRef} style={{minHeight:'100vh',position:'relative',overflow:'hidden',padding:'0 56px',display:'flex',flexDirection:'column',background:'#f8f8f6'}}>

        {/* Grid texture */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(rgba(0,0,0,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.022) 1px,transparent 1px)',backgroundSize:'68px 68px'}}/>

        {/* Ambient orbs */}
        {[
          {top:'-8%',left:'-4%',w:580,h:580,c:'#7c5cfc',delay:'0s'},
          {bottom:'4%',right:'-6%',w:500,h:500,c:'#10b981',delay:'1.8s'},
          {top:'55%',left:'38%',w:300,h:300,c:'#2563eb',delay:'3.2s'},
        ].map((o,i)=>(
          <div key={i} style={{
            position:'absolute',top:o.top,left:o.left,bottom:o.bottom,right:o.right,
            width:o.w,height:o.h,borderRadius:'50%',pointerEvents:'none',
            background:`radial-gradient(circle,${o.c}0d 0%,transparent 70%)`,
            animation:`float-orb ${7+i*2}s ease-in-out infinite`,animationDelay:o.delay,
            filter:'blur(8px)',
          }}/>
        ))}

         {/* ── NAVBAR ──  Using NAVBAR from components */}

        {/* ── SPLIT BODY ── */}
        <motion.div className="hs"
          style={{opacity:heroOpac,display:'flex',alignItems:'center',gap:72,flex:1,paddingBottom:80,paddingTop:24,position:'relative',zIndex:1}}
        >
          {/* LEFT */}
          <div style={{flex:'0 0 auto',maxWidth:540,width:'100%'}}>

            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.5,delay:.08}} style={{marginBottom:26}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:11.5,fontWeight:600,color:'#555',padding:'6px 13px',borderRadius:100,border:'1px solid #e0e0dc',background:'#fff',letterSpacing:'.01em',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#10b981',display:'inline-block',boxShadow:'0 0 0 3px rgba(16,185,129,.18)'}}/>
                v2.0 — GraphRAG + Multi-hop Reasoning
              </span>
            </motion.div>

            {/* Headline lines — clip reveal */}
            {[
              [{t:'RAG',col:'#0d0d0e'}],
              [{t:'that ',col:'#0d0d0e'},{t:'knows',grad:true}],
              [{t:'when ',col:'#c5c5c0'},{t:"it's wrong.",col:'#0d0d0e',ul:true}],
            ].map((line,li)=>(
              <div key={li} style={{overflow:'hidden',paddingBottom:li<2?4:0}}>
                <motion.div initial={{y:'105%'}} animate={{y:'0%'}}
                  transition={{duration:.92,delay:.14+li*.08,ease:[0.16,1,0.3,1]}}
                  className="hh"
                  style={{fontSize:78,fontWeight:900,lineHeight:.94,letterSpacing:'-.058em',margin:0,display:'flex',alignItems:'baseline',flexWrap:'wrap',gap:'0.18em'}}
                >
                  {line.map((w,wi)=>(
                    <span key={wi} style={{position:'relative',color:w.col,...(w.grad?{background:'linear-gradient(135deg,#2563eb 0%,#10b981 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}:{})}}>
                      {w.t}
                      {w.ul&&(
                        <motion.span initial={{scaleX:0}} animate={{scaleX:1}} transition={{duration:.75,delay:1.08,ease:[0.16,1,0.3,1]}}
                          style={{position:'absolute',left:0,right:0,bottom:9,height:5,background:'linear-gradient(90deg,#2563eb,#10b981)',borderRadius:3,transformOrigin:'left',opacity:.28}}/>
                      )}
                    </span>
                  ))}
                </motion.div>
              </div>
            ))}

            <motion.p initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.52}}
              style={{fontSize:16.5,color:'#6a6a6a',lineHeight:1.78,maxWidth:450,margin:'24px 0 36px'}}
            >
              A production-grade retrieval system that{' '}
              <strong style={{color:'#222',fontWeight:650}}>critiques its own outputs</strong>, triggers web fallback when local context is insufficient, and builds a{' '}
              <strong style={{color:'#222',fontWeight:650}}>persistent memory graph</strong> across conversations.
            </motion.p>

            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.64}}
              style={{display:'flex',gap:10,alignItems:'center',marginBottom:52,flexWrap:'wrap'}}
            >
              <Link to="/app"
                style={{display:'inline-flex',alignItems:'center',gap:8,padding:'13px 26px',borderRadius:10,background:'#0d0d0e',color:'#fff',fontSize:14.5,fontWeight:700,textDecoration:'none',letterSpacing:'-.022em',boxShadow:'0 2px 10px rgba(0,0,0,.22)',transition:'all .2s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#1e1e22';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.26)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#0d0d0e';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,.22)'}}
              >
                Launch App {Ico.arrowDiag(13)}
              </Link>
              <a href="#architecture"
                style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 22px',borderRadius:10,background:'#fff',color:'#444',fontSize:14.5,fontWeight:600,textDecoration:'none',letterSpacing:'-.02em',border:'1px solid #ddd',boxShadow:'0 1px 4px rgba(0,0,0,.06)',transition:'all .18s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#aaa';e.currentTarget.style.background='#fafaf8'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#ddd';e.currentTarget.style.background='#fff'}}
              >
                View Architecture {Ico.arrow(12)}
              </a>
            </motion.div>

            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.6,delay:.88}}
              style={{display:'flex',gap:36,flexWrap:'wrap'}}
            >
              {[{val:'8',lbl:'Pipeline nodes'},{val:'2',lbl:'Critique loops'},{val:'+31%',lbl:'Faithfulness gain'},{val:'3',lbl:'Research papers'}].map(s=>(
                <div key={s.val}>
                  <div style={{fontSize:24,fontWeight:900,color:'#0d0d0e',letterSpacing:'-.055em',lineHeight:1}}>{s.val}</div>
                  <div style={{fontSize:11,color:'#aaa',marginTop:3,letterSpacing:'.02em'}}>{s.lbl}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT — Terminal card */}
          <div className="hr" style={{flex:1,minWidth:0}}>
            <motion.div
              initial={{opacity:0,x:44,scale:.97}} animate={{opacity:1,x:0,scale:1}}
              transition={{duration:.95,delay:.42,ease:[0.16,1,0.3,1]}}
              style={{background:'#fff',border:'1px solid #e2e2de',borderRadius:24,overflow:'hidden',boxShadow:'0 2px 0 #e2e2de, 0 28px 80px rgba(0,0,0,.10), 0 6px 20px rgba(0,0,0,.05)'}}
            >
              {/* Chrome */}
              <div style={{padding:'13px 18px',background:'#f2f2ee',borderBottom:'1px solid #e8e8e4',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',gap:7,alignItems:'center'}}>
                  {['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:11,height:11,borderRadius:'50%',background:c}}/>)}
                </div>
                <div style={{fontSize:11,color:'#bbb',fontFamily:'monospace',letterSpacing:'.04em'}}>adaptive-rag — ~/docs</div>
                <div style={{width:64}}/>
              </div>
              {/* Terminal */}
              <div style={{background:'#0e0d0c',padding:'22px 24px'}}>
                <div style={{marginBottom:6}}>
                  <span style={{fontFamily:'monospace',fontSize:12.5,color:'#10b981'}}>❯ </span>
                  <span style={{fontFamily:'monospace',fontSize:12.5,color:'rgba(255,255,255,.82)'}}>{typed}</span>
                  <span style={{fontFamily:'monospace',fontSize:12.5,color:'#2563eb',animation:'blink 1s infinite'}}>▌</span>
                </div>
                <div style={{fontSize:10,color:'#3a3a3a',fontFamily:'monospace',marginTop:4}}>Running 8-node pipeline…</div>
              </div>
              {/* Pipeline */}
              <div style={{padding:'18px 20px'}}>
                <div style={{fontSize:9,color:'#c0c0bc',fontFamily:'monospace',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:13}}>Live pipeline execution</div>
                <PipelineViz/>
              </div>
              {/* Status bar */}
              <div style={{padding:'14px 20px',borderTop:'1px solid #f0f0ec',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fafaf8'}}>
                <div style={{display:'flex',gap:20}}>
                  {[{l:'Faithfulness',v:'0.89',c:'#059669'},{l:'Relevancy',v:'0.91',c:'#2563eb'},{l:'Precision',v:'0.84',c:'#7c5cfc'}].map(m=>(
                    <div key={m.l}>
                      <div style={{fontSize:8.5,color:'#ccc',letterSpacing:'.04em',marginBottom:2,fontFamily:'monospace'}}>{m.l}</div>
                      <div style={{fontSize:15,fontWeight:900,color:m.c,letterSpacing:'-.05em'}}>{m.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#059669',fontWeight:600}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:'#10b981',position:'relative'}}>
                    <div style={{position:'absolute',inset:0,borderRadius:'50%',animation:'pulse-ring 1.6s ease-out infinite',border:'1.5px solid #10b981'}}/>
                  </div>
                  Live
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ══ MARQUEE ═══════════════════════════════════════════════════ */}
      <div style={{borderTop:'1px solid #e8e8e4',borderBottom:'1px solid #e8e8e4',background:'#fff',overflow:'hidden'}}>
        <div style={{padding:'10px 0',borderBottom:'1px solid #f2f2ee'}}><Marquee items={MQ_TOP} speed={34}/></div>
        <div style={{padding:'10px 0'}}><Marquee items={MQ_BOT} speed={26} reverse/></div>
      </div>

      {/* ══ STATS ═════════════════════════════════════════════════════ */}
      <section style={{padding:'80px 56px',maxWidth:1100,margin:'0 auto'}}>
        <div className="sg" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:3}}>
          {[
            {num:3,s:'',lbl:'Research Papers',sub:'Self-RAG · CRAG · GraphRAG',c:'#7c5cfc'},
            {num:8,s:'',lbl:'Pipeline Nodes',sub:'LangGraph state machine',c:'#2563eb'},
            {num:31,s:'%',lbl:'Faithfulness gain',sub:'vs vanilla RAG baseline',c:'#059669'},
            {num:2,s:'×',lbl:'Retrieval Methods',sub:'FAISS + BM25 via RRF',c:'#10b981'},
          ].map((s,i)=>(
            <FadeUp key={s.lbl} delay={i*.07}>
              <motion.div whileHover={{y:-3}}
                style={{padding:'32px 28px',border:'1px solid #eaeae6',borderRadius:18,background:'#fff',transition:'border-color .18s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=s.c+'45'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='#eaeae6'}
              >
                <div style={{fontSize:54,fontWeight:900,letterSpacing:'-.07em',lineHeight:1,color:s.c,marginBottom:10}}>
                  <CountUp to={s.num} suffix={s.s} duration={1.4}/>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:'#111',marginBottom:4,letterSpacing:'-.018em'}}>{s.lbl}</div>
                <div style={{fontSize:11,color:'#bbb',fontFamily:'monospace'}}>{s.sub}</div>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════ */}
      <section style={{padding:'80px 56px 100px',background:'#fff',borderTop:'1px solid #eaeae6'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{marginBottom:60}}>
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
                <span style={{fontSize:10.5,fontWeight:700,color:'#7c5cfc',letterSpacing:'.07em',textTransform:'uppercase',whiteSpace:'nowrap'}}>Core Capabilities</span>
                <div style={{flex:1,height:1,background:'#f0f0ec'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto',alignItems:'end',gap:24}}>
                <h2 style={{fontSize:'clamp(32px,4.5vw,56px)',fontWeight:900,letterSpacing:'-.052em',lineHeight:1.03,color:'#0d0d0e',margin:0}}>
                  Beyond retrieval.<br/>
                  <span style={{background:'linear-gradient(135deg,#7c5cfc,#2563eb)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Self-aware reasoning.</span>
                </h2>
                <p className="hsm" style={{fontSize:13.5,color:'#888',maxWidth:270,lineHeight:1.76,marginBottom:4}}>Every component validates, critiques, and improves its own outputs before surfacing an answer.</p>
              </div>
            </div>
          </FadeUp>
          <div className="fg" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            <FeatureCard number={1} delay={0}    iconKey="brain"   color="#7c5cfc" title="Query Intelligence"      desc="Rewrites ambiguous queries, decomposes multi-part questions, and classifies intent before any retrieval begins."/>
            <FeatureCard number={2} delay={.06}  iconKey="db"      color="#2563eb" title="Hybrid Retrieval"        desc="Fuses dense FAISS semantic search with sparse BM25 keyword matching via Reciprocal Rank Fusion for maximum coverage."/>
            <FeatureCard number={3} delay={.12}  iconKey="shield"  color="#ef4444" title="Relevance Critique"      desc="Scores every retrieved chunk 0–1. If the aggregate falls below threshold, CRAG triggers a corrective web search."/>
            <FeatureCard number={4} delay={.18}  iconKey="layers"  color="#10b981" title="Cross-Encoder Rerank"    desc="ms-marco MiniLM re-ranks top candidates with full query-document joint scoring — not just dot-product similarity."/>
            <FeatureCard number={5} delay={.24}  iconKey="refresh" color="#ef4444" title="Hallucination Guard"     desc="After generation, a second critic checks every claim against retrieved context. Failed checks trigger a retry loop."/>
            <FeatureCard number={6} delay={.30}  iconKey="network" color="#8b5cf6" title="Persistent Memory Graph" desc="Entities and relationships from every conversation are persisted in a NetworkX knowledge graph for multi-hop reasoning."/>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════ */}
      <section id="how-it-works" style={{padding:'100px 56px',maxWidth:1100,margin:'0 auto'}}>
        <FadeUp>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
            <span style={{fontSize:10.5,fontWeight:700,color:'#2563eb',letterSpacing:'.07em',textTransform:'uppercase',whiteSpace:'nowrap'}}>How It Works</span>
            <div style={{flex:1,height:1,background:'#f0f0ec'}}/>
          </div>
          <h2 style={{fontSize:'clamp(28px,4.5vw,54px)',fontWeight:900,letterSpacing:'-.052em',lineHeight:1.03,color:'#0d0d0e',marginBottom:52}}>
            Two critique loops.<br/>
            <span style={{background:'linear-gradient(135deg,#2563eb,#10b981)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Zero hallucinations.</span>
          </h2>
        </FadeUp>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:12}}>
          {[
            {step:'01',color:'#ef4444',title:'Retrieval Critique',body:'Every chunk returned from the vector store and BM25 index is scored by a cross-encoder critic. Chunks below 0.4 confidence are discarded. If fewer than 3 chunks pass, the pipeline escalates to live web search via Tavily.'},
            {step:'02',color:'#ef4444',title:'Answer Critique',body:'Once the LLM generates an answer, a second critic evaluates every factual claim against the retrieved context. Unsupported claims are flagged, and the response is regenerated with tighter constraints until it passes or the retry limit is hit.'},
            {step:'03',color:'#059669',title:'Memory Persistence',body:'Named entities, relationships and key facts extracted from each conversation turn are written to a persistent NetworkX graph store. Future queries retrieve this structured knowledge alongside vector chunks, enabling multi-hop reasoning.'},
          ].map((item,i)=>(
            <FadeUp key={item.step} delay={i*.1}>
              <div style={{padding:'28px 26px',border:'1px solid #eaeae6',borderRadius:18,background:'#fff',height:'100%',transition:'border-color .18s,box-shadow .2s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=item.color+'38';e.currentTarget.style.boxShadow=`0 8px 32px ${item.color}10`}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#eaeae6';e.currentTarget.style.boxShadow='none'}}
              >
                <div style={{display:'flex',alignItems:'center',gap:13,marginBottom:18}}>
                  <div style={{width:40,height:40,borderRadius:11,background:`${item.color}0f`,border:`1px solid ${item.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:13,fontWeight:800,color:item.color}}>{item.step}</div>
                  <div style={{fontSize:15,fontWeight:700,color:'#111',letterSpacing:'-.025em'}}>{item.title}</div>
                </div>
                <p style={{fontSize:13.5,color:'#777',lineHeight:1.78,margin:0}}>{item.body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ══ ARCHITECTURE ══════════════════════════════════════════════ */}
      <section id="architecture" style={{padding:'96px 56px',background:'#fff',borderTop:'1px solid #eaeae6',borderBottom:'1px solid #eaeae6'}}>
        <div style={{maxWidth:960,margin:'0 auto'}}>
          <FadeUp>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
              <span style={{fontSize:10.5,fontWeight:700,color:'#2563eb',letterSpacing:'.07em',textTransform:'uppercase',whiteSpace:'nowrap'}}>System Architecture</span>
              <div style={{flex:1,height:1,background:'#f0f0ec'}}/>
            </div>
            <h2 style={{fontSize:'clamp(26px,4vw,52px)',fontWeight:900,letterSpacing:'-.052em',lineHeight:1.03,color:'#0d0d0e',marginBottom:48}}>
              LangGraph state machine.<br/>
              <span style={{background:'linear-gradient(135deg,#2563eb,#10b981)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>8 nodes. 2 critique loops.</span>
            </h2>
          </FadeUp>
          <FadeUp delay={.1}>
            <div style={{background:'#f8f8f6',border:'1px solid #eaeae6',borderRadius:18,padding:'24px'}}>
              {ARCH.map((row,ri)=>(
                <div key={ri} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                  {!row.first&&ri>0&&<div style={{width:1,height:14,background:'#ddd'}}/>}
                  {row.split?(
                    <div style={{display:'flex',gap:8,width:'100%',maxWidth:600,justifyContent:'center'}}>
                      {[row.left,row.right].map((n,ni)=>(
                        <div key={ni} style={{flex:1,padding:'8px 14px',borderRadius:8,textAlign:'center',background:`${n.c}09`,border:`1px solid ${n.c}22`,fontSize:11.5,color:n.c,fontWeight:600}}>{n.l}</div>
                      ))}
                    </div>
                  ):(
                    <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',width:'100%',maxWidth:780}}>
                      {row.nodes.map(n=>(
                        <div key={n.l} style={{padding:'8px 14px',borderRadius:8,textAlign:'center',background:`${n.c}09`,border:`1px solid ${n.c}22`,minWidth:n.w||'auto',flex:row.nodes.length>1?1:'none',maxWidth:row.nodes.length>1?200:(n.w||440)}}>
                          {n.badge&&<div style={{fontSize:7.5,color:n.c,fontFamily:'monospace',letterSpacing:'.1em',marginBottom:2,textTransform:'uppercase'}}>{n.badge}</div>}
                          <div style={{fontSize:11.5,fontWeight:700,color:n.c,letterSpacing:'-.015em'}}>{n.l}</div>
                          {n.d&&<div style={{fontSize:9.5,color:'#bbb',fontFamily:'monospace',marginTop:2}}>{n.d}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══ BENCHMARKS ════════════════════════════════════════════════ */}
      <section id="benchmarks" style={{padding:'100px 56px',maxWidth:1060,margin:'0 auto'}}>
        <FadeUp>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
            <span style={{fontSize:10.5,fontWeight:700,color:'#059669',letterSpacing:'.07em',textTransform:'uppercase',whiteSpace:'nowrap'}}>Benchmark Results</span>
            <div style={{flex:1,height:1,background:'#f0f0ec'}}/>
          </div>
          <h2 style={{fontSize:'clamp(26px,4vw,52px)',fontWeight:900,letterSpacing:'-.052em',lineHeight:1.03,color:'#0d0d0e',marginBottom:14}}>
            Measured on RAGAS.<br/>
            <span style={{background:'linear-gradient(135deg,#059669,#10b981)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Critique loops make the difference.</span>
          </h2>
          <p style={{fontSize:14.5,color:'#888',maxWidth:480,lineHeight:1.76,marginBottom:48}}>Evaluated against the same document corpus. The system refuses to hallucinate — it either finds a grounded answer or says it can't.</p>
        </FadeUp>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:10}}>
          <MetricCard delay={0}    label="faithfulness"      baseline={.61} adaptive={.89} color="#059669"/>
          <MetricCard delay={.07}  label="answer_relevancy"  baseline={.72} adaptive={.91} color="#2563eb"/>
          <MetricCard delay={.14}  label="context_precision" baseline={.58} adaptive={.84} color="#7c5cfc"/>
          <MetricCard delay={.21}  label="context_recall"    baseline={.64} adaptive={.88} color="#10b981"/>
        </div>
      </section>

      {/* ══ RESEARCH PAPERS ═══════════════════════════════════════════ */}
      <section style={{padding:'96px 56px',background:'#fff',borderTop:'1px solid #eaeae6'}}>
        <div style={{maxWidth:1060,margin:'0 auto'}}>
          <FadeUp>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
              <span style={{fontSize:10.5,fontWeight:700,color:'#b45309',letterSpacing:'.07em',textTransform:'uppercase',whiteSpace:'nowrap'}}>Research Foundation</span>
              <div style={{flex:1,height:1,background:'#f0f0ec'}}/>
            </div>
            <h2 style={{fontSize:'clamp(26px,4vw,52px)',fontWeight:900,letterSpacing:'-.052em',lineHeight:1.03,color:'#0d0d0e',marginBottom:48}}>
              Three papers.<br/>
              <span style={{background:'linear-gradient(135deg,#b45309,#7c5cfc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>One system.</span>
            </h2>
          </FadeUp>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:10}}>
            <PaperCard delay={0}   title="Self-RAG: Learning to Retrieve, Generate, and Critique" authors="Asai et al." year="2023" tag="Self-RAG" tagColor="purple" desc="Introduces learnable reflection tokens — [Retrieve], [Relevant], [IsSupported] — so the model controls when to retrieve and validates each chunk inline, rather than blindly using all context."/>
            <PaperCard delay={.08} title="Corrective Retrieval Augmented Generation"             authors="Yan et al."   year="2024" tag="CRAG"     tagColor="amber"  desc="When retrieved documents score below a relevance threshold, CRAG triggers an external web search as a corrective step rather than hallucinating an answer from weak context."/>
            <PaperCard delay={.16} title="From Local to Global: A Graph RAG Approach"            authors="Edge et al."  year="2024" tag="GraphRAG" tagColor="teal"   desc="Entities and relationships stored in a knowledge graph enable multi-hop reasoning that pure vector similarity cannot handle — critical for complex, multi-document questions."/>
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════════ */}
      <section style={{padding:'130px 56px',position:'relative',overflow:'hidden',background:'#0c0c0e'}}>
        <div style={{position:'absolute',top:'35%',right:'8%',width:640,height:640,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,.09) 0%,transparent 68%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'-8%',left:'4%',width:440,height:440,background:'radial-gradient(circle,rgba(37,99,235,.09) 0%,transparent 68%)',pointerEvents:'none'}}/>
        <FadeUp>
          <div style={{maxWidth:1060,margin:'0 auto',position:'relative',zIndex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
              <span style={{fontSize:10.5,fontWeight:700,color:'#10b981',letterSpacing:'.07em',textTransform:'uppercase'}}>Ready to run</span>
              <div style={{width:28,height:1,background:'#10b981',opacity:.5}}/>
            </div>
            <h2 style={{fontSize:'clamp(42px,6vw,84px)',fontWeight:900,letterSpacing:'-.058em',lineHeight:1.01,marginBottom:20,color:'#fff'}}>
              Ask anything.<br/>
              <span style={{background:'linear-gradient(135deg,#2563eb 0%,#10b981 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Watch it think.</span>
            </h2>
            <p style={{fontSize:16.5,color:'rgba(255,255,255,.42)',maxWidth:420,margin:'0 0 42px',lineHeight:1.78}}>
              Upload your documents, run a query, and see every critique score, confidence metric and source citation update in real time.
            </p>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <Link to="/app"
                style={{display:'inline-flex',alignItems:'center',gap:8,padding:'14px 30px',borderRadius:10,background:'#fff',color:'#0c0c0e',fontSize:15,fontWeight:700,textDecoration:'none',letterSpacing:'-.025em',boxShadow:'0 2px 12px rgba(255,255,255,.12)',transition:'all .2s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#e8e8e8';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(255,255,255,.16)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 2px 12px rgba(255,255,255,.12)'}}
              >
                Open the App {Ico.arrowDiag(13)}
              </Link>
              <a href="https://github.com" target="_blank" rel="noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:8,padding:'13px 26px',borderRadius:10,background:'transparent',color:'rgba(255,255,255,.65)',fontSize:15,fontWeight:600,textDecoration:'none',letterSpacing:'-.02em',border:'1px solid rgba(255,255,255,.14)',transition:'all .18s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.32)';e.currentTarget.style.color='#fff'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.14)';e.currentTarget.style.color='rgba(255,255,255,.65)'}}
              >
                {Ico.github(14)} Star on GitHub
              </a>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════ */}
      <footer style={{borderTop:'1px solid #1a1a1e',background:'#0c0c0e',padding:'26px 56px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:26,height:26,borderRadius:7,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {Ico.zap('#0c0c0e',11)}
          </div>
          <span style={{fontSize:14.5,fontWeight:800,color:'#fff',letterSpacing:'-.035em'}}>AdaptiveRAG</span>
        </div>
        <p style={{fontSize:11,color:'#3a3a3a',fontFamily:'monospace'}}>LangChain · LangGraph · FAISS · Mistral AI · RAGAS</p>
      </footer>
    </div>
  )
}
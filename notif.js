/* ── SPLITPOOL NOTIF.JS v2 ── */
/* Polling 2s — pontos (comportamento original) + central de notificações (sino + painel) */

(function(){
  var SBU='https://eawfweuamtwlsilrkgoo.supabase.co';
  var SBK='sb_publishable_bqFMwjSFO3wczN7guuCx3w_UFKnF-gQ';

  var PAGE=location.pathname.split('/').pop()||'index.html';

  var NOTIF_PAGE={
    'membro_entrou':'dashboard-owner.html',
    'acesso_confirmado':'dashboard-owner.html',
    'acesso_enviado':'meus-planos.html',
    'repasse_aprovado':'dashboard-owner.html',
    'repasse_pago':'dashboard-owner.html',
    'piscina_cheia':'dashboard-owner.html'
  };

  var ICONE_TIPO={
    'membro_entrou':'🏊',
    'acesso_confirmado':'✅',
    'acesso_enviado':'🔑',
    'repasse_aprovado':'💵',
    'repasse_pago':'💵',
    'piscina_cheia':'🎉'
  };

  var cacheNotifs=[];
  var painelAberto=false;

  function getSession(){
    try{
      var raw=localStorage.getItem('sb-eawfweuamtwlsilrkgoo-auth-token');
      if(raw){
        var v=JSON.parse(raw);
        if(v&&v.user&&v.user.id&&v.access_token)
          return {uid:v.user.id, token:v.access_token};
      }
    }catch(e){}
    return null;
  }

  function tempoRelativo(iso){
    try{
      var diff=Math.floor((Date.now()-new Date(iso).getTime())/1000);
      if(diff<60) return 'agora';
      if(diff<3600) return Math.floor(diff/60)+' min';
      if(diff<86400) return Math.floor(diff/3600)+' h';
      if(diff<604800) return Math.floor(diff/86400)+' d';
      return new Date(iso).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    }catch(e){ return ''; }
  }

  async function marcarLidas(ids, token){
    if(!ids.length) return;
    await fetch(SBU+'/rest/v1/notificacoes?id=in.('+ids.join(',')+')',{
      method:'PATCH',
      headers:{
        'apikey':SBK,
        'Authorization':'Bearer '+token,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      },
      body:JSON.stringify({lida:true})
    });
  }

  /* ── INJETAR SINO (desktop) E ITEM MOBILE ── */
  function injetarUI(){
    var navRight=document.querySelector('.nav-right');
    if(navRight&&!document.getElementById('notif-bell')){
      var bell=document.createElement('button');
      bell.id='notif-bell';
      bell.setAttribute('aria-label','Notificações');
      bell.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg><span id="notif-count"></span>';
      bell.addEventListener('click',function(ev){ev.stopPropagation();togglePainel();});
      var sairBtn=null;
      navRight.querySelectorAll('button.nav-btn').forEach(function(b){
        if(b.textContent.trim()==='Sair') sairBtn=b;
      });
      if(sairBtn) navRight.insertBefore(bell,sairBtn);
      else navRight.appendChild(bell);
    }

    var mobMenu=document.getElementById('mob-menu');
    if(mobMenu&&!document.getElementById('mob-lnk-notif')){
      var item=document.createElement('button');
      item.id='mob-lnk-notif';
      item.className='mob-lnk';
      item.innerHTML='Notificações<span id="mob-notif-count" class="mob-lnk-dot" style="display:none;"></span>';
      item.addEventListener('click',function(ev){
        ev.stopPropagation();
        if(typeof toggleMenu==='function') toggleMenu();
        togglePainel();
      });
      mobMenu.insertBefore(item,mobMenu.firstChild);
    }

    if(!document.getElementById('notif-panel')){
      var panel=document.createElement('div');
      panel.id='notif-panel';
      panel.innerHTML='<div id="notif-panel-head"><span>Notificações</span><button id="notif-mark-all">Marcar todas como lidas</button></div><div id="notif-panel-list"></div>';
      document.body.appendChild(panel);
      document.getElementById('notif-mark-all').addEventListener('click',async function(){
        var sess=getSession();
        if(!sess) return;
        var ids=cacheNotifs.filter(function(n){return !n.lida;}).map(function(n){return n.id;});
        await marcarLidas(ids,sess.token);
        cacheNotifs.forEach(function(n){n.lida=true;});
        renderPainel();
        poll();
      });
      document.addEventListener('click',function(ev){
        if(painelAberto&&!panel.contains(ev.target)){
          fecharPainel();
        }
      });
    }
  }

  function togglePainel(){
    if(painelAberto){ fecharPainel(); } else { abrirPainel(); }
  }

  function abrirPainel(){
    painelAberto=true;
    var p=document.getElementById('notif-panel');
    if(p){ p.classList.add('open'); renderPainel(); }
  }

  function fecharPainel(){
    painelAberto=false;
    var p=document.getElementById('notif-panel');
    if(p) p.classList.remove('open');
  }

  function renderPainel(){
    var list=document.getElementById('notif-panel-list');
    if(!list) return;
    if(!cacheNotifs.length){
      list.innerHTML='<div class="notif-vazio">Nenhuma notificação por aqui ainda.</div>';
      return;
    }
    list.innerHTML='';
    cacheNotifs.forEach(function(n){
      var item=document.createElement('div');
      item.className='notif-item'+(n.lida?'':' nao-lida');
      var icone=ICONE_TIPO[n.tipo]||'🔔';
      var msg=n.mensagem||'';
      item.innerHTML='<div class="notif-ico">'+icone+'</div><div class="notif-body"><div class="notif-msg"></div><div class="notif-tempo">'+tempoRelativo(n.created_at)+'</div></div>'+(n.lida?'':'<div class="notif-dot-item"></div>');
      item.querySelector('.notif-msg').textContent=msg;
      item.addEventListener('click',async function(){
        var sess=getSession();
        if(sess&&!n.lida){
          await marcarLidas([n.id],sess.token);
          n.lida=true;
        }
        if(n.link){ window.location.href=n.link; }
        else { renderPainel(); poll(); }
      });
      list.appendChild(item);
    });
  }

  async function poll(){
    var sess=getSession();
    if(!sess) return;
    var uid=sess.uid;
    var token=sess.token;

    var res=await fetch(SBU+'/rest/v1/notificacoes?select=id,tipo,mensagem,link,lida,created_at&user_id=eq.'+uid+'&order=created_at.desc&limit=20',{
      headers:{'apikey':SBK,'Authorization':'Bearer '+token}
    });
    if(!res.ok) return;
    var todas=await res.json();
    cacheNotifs=todas||[];
    var notifs=cacheNotifs.filter(function(n){return !n.lida;});

    var tem=notifs.length>0;

    /* Contador do sino */
    var cnt=document.getElementById('notif-count');
    if(cnt){
      if(tem){ cnt.textContent=notifs.length>9?'9+':String(notifs.length); cnt.classList.add('show'); }
      else { cnt.textContent=''; cnt.classList.remove('show'); }
    }
    var mobCnt=document.getElementById('mob-notif-count');
    if(mobCnt) mobCnt.style.display=tem?'inline-block':'none';

    if(painelAberto) renderPainel();

    /* ── COMPORTAMENTO ORIGINAL (pontos) — preservado ── */
    var hamDot=document.getElementById('ham-dot');
    if(hamDot) hamDot.classList.toggle('show',tem);

    var destinos={};
    notifs.forEach(function(n){
      var dest=NOTIF_PAGE[n.tipo];
      if(dest) destinos[dest]=true;
    });

    var ddash=document.getElementById('mob-dot-dashboard');
    if(ddash) ddash.style.display=destinos['dashboard-owner.html']?'inline-block':'none';

    var dmp=document.getElementById('mob-dot-meusplanos');
    if(dmp) dmp.style.display=destinos['meus-planos.html']?'inline-block':'none';

    var btnDash=document.getElementById('nav-btn-dashboard');
    if(btnDash){
      var hasDash=destinos['dashboard-owner.html'];
      btnDash.style.position='relative';
      var bd=document.getElementById('nav-badge-dashboard');
      if(!bd&&hasDash){
        bd=document.createElement('span');
        bd.id='nav-badge-dashboard';
        bd.style.cssText='position:absolute;top:-4px;right:-4px;width:9px;height:9px;border-radius:50%;background:#e74c3c;border:2px solid #fff;display:block;';
        btnDash.appendChild(bd);
      } else if(bd&&!hasDash){
        bd.remove();
      }
    }

    var btnMp=document.getElementById('nav-btn-meusplanos');
    if(btnMp){
      var hasMp=destinos['meus-planos.html'];
      btnMp.style.position='relative';
      var bm=document.getElementById('nav-badge-meusplanos');
      if(!bm&&hasMp){
        bm=document.createElement('span');
        bm.id='nav-badge-meusplanos';
        bm.style.cssText='position:absolute;top:-4px;right:-4px;width:9px;height:9px;border-radius:50%;background:#e74c3c;border:2px solid #fff;display:block;';
        btnMp.appendChild(bm);
      } else if(bm&&!hasMp){
        bm.remove();
      }
    }

    /* Marcar como lidas ao visitar a página destino — original preservado */
    var tiposDestaPagina=Object.keys(NOTIF_PAGE).filter(function(t){
      return NOTIF_PAGE[t]===PAGE;
    });
    if(tiposDestaPagina.length&&notifs.length){
      var ids=notifs
        .filter(function(n){return tiposDestaPagina.indexOf(n.tipo)!==-1;})
        .map(function(n){return n.id;});
      if(ids.length){
        marcarLidas(ids,token);
      }
    }
  }

  /* ── CSS ── */
  var style=document.createElement('style');
  style.textContent=[
    '#ham-dot{position:absolute;top:5px;right:5px;width:9px;height:9px;',
    'border-radius:50%;background:#e74c3c;display:none;border:2px solid #fff;z-index:2;}',
    '#ham-dot.show{display:block;}',
    '.mob-lnk-dot{display:inline-block;width:8px;height:8px;border-radius:50%;',
    'background:#e74c3c;margin-left:6px;vertical-align:middle;}',
    '#notif-bell{position:relative;background:transparent;border:1px solid rgba(0,160,200,0.25);',
    'border-radius:8px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;',
    'cursor:pointer;color:#0A3080;transition:.2s;flex-shrink:0;}',
    '#notif-bell:hover{border-color:#1255CC;background:rgba(18,85,204,0.06);}',
    '#notif-count{position:absolute;top:-6px;right:-6px;min-width:17px;height:17px;padding:0 4px;',
    'border-radius:9px;background:#e74c3c;color:#fff;font-size:10px;font-weight:800;',
    'display:none;align-items:center;justify-content:center;border:2px solid #fff;line-height:1;}',
    '#notif-count.show{display:flex;}',
    '#notif-panel{position:fixed;top:72px;right:24px;width:360px;max-width:calc(100vw - 24px);',
    'max-height:70vh;background:#fff;border:1px solid rgba(0,160,200,0.25);border-radius:14px;',
    'box-shadow:0 12px 40px rgba(10,48,128,0.18);z-index:5000;display:none;flex-direction:column;overflow:hidden;}',
    '#notif-panel.open{display:flex;}',
    '#notif-panel-head{display:flex;align-items:center;justify-content:space-between;',
    'padding:14px 16px;border-bottom:1px solid rgba(0,160,200,0.15);}',
    '#notif-panel-head span{font-size:15px;font-weight:800;color:#0A3080;}',
    '#notif-mark-all{background:transparent;border:none;color:#1255CC;font-size:12px;font-weight:700;',
    'cursor:pointer;font-family:inherit;padding:4px;}',
    '#notif-mark-all:hover{text-decoration:underline;}',
    '#notif-panel-list{overflow-y:auto;flex:1;}',
    '.notif-item{display:flex;gap:12px;align-items:flex-start;padding:13px 16px;cursor:pointer;',
    'border-bottom:1px solid rgba(0,160,200,0.08);transition:.15s;}',
    '.notif-item:hover{background:rgba(18,85,204,0.05);}',
    '.notif-item.nao-lida{background:rgba(0,200,215,0.06);}',
    '.notif-item.nao-lida:hover{background:rgba(0,200,215,0.12);}',
    '.notif-ico{font-size:18px;flex-shrink:0;line-height:1.3;}',
    '.notif-body{flex:1;min-width:0;}',
    '.notif-msg{font-size:13px;color:#0C2461;font-weight:600;line-height:1.45;}',
    '.notif-tempo{font-size:11px;color:#0A3080;opacity:.5;margin-top:3px;font-weight:600;}',
    '.notif-dot-item{width:8px;height:8px;border-radius:50%;background:#00C8D7;flex-shrink:0;margin-top:5px;}',
    '.notif-vazio{padding:32px 16px;text-align:center;font-size:13px;color:#0A3080;opacity:.5;font-weight:600;}',
    '@media (max-width:680px){#notif-panel{top:64px;right:12px;left:12px;width:auto;}}'
  ].join('');
  document.head.appendChild(style);

  function start(){
    injetarUI();
    poll();
    setInterval(poll,2000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start);
  } else {
    setTimeout(start,500);
  }
})();

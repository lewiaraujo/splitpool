/* ── SPLITPOOL NOTIF.JS ── */
/* Polling 2s — ponto no hamburguer (mobile) e badge no nav (desktop) */

(function(){
  var SBU='https://eawfweuamtwlsilrkgoo.supabase.co';
  var SBK='sb_publishable_bqFMwjSFO3wczN7guuCx3w_UFKnF-gQ';

  // Detectar página atual
  var PAGE=location.pathname.split('/').pop()||'index.html';

  // Mapa: tipo de notificação → página destino
  var NOTIF_PAGE={
    'membro_entrou':'dashboard-owner.html',
    'acesso_confirmado':'dashboard-owner.html',
    'acesso_enviado':'meus-planos.html'
  };

  // Buscar usuário logado via Supabase REST
  async function getUser(){
    try{
      // Tenta pegar do localStorage do Supabase
      for(var k in localStorage){
        if(k.indexOf('supabase.auth.token')!==-1||k.indexOf('sb-')!==-1){
          try{
            var v=JSON.parse(localStorage[k]);
            var u=v&&(v.user||(v.currentSession&&v.currentSession.user));
            if(u&&u.id) return u.id;
          }catch(e){}
        }
      }
    }catch(e){}
    return null;
  }

  async function poll(){
    var uid=await getUser();
    if(!uid) return;

    var res=await fetch(SBU+'/rest/v1/notificacoes?select=id,tipo,lida&user_id=eq.'+uid+'&lida=eq.false&limit=20',{
      headers:{'apikey':SBK,'Authorization':'Bearer '+SBK}
    });
    if(!res.ok) return;
    var notifs=await res.json();

    var tem=notifs&&notifs.length>0;

    // ── MOBILE: ponto no hamburguer ──
    var hamDot=document.getElementById('ham-dot');
    if(hamDot) hamDot.classList.toggle('show',tem);

    // ── MOBILE: ponto ao lado do item de menu correto ──
    var destinos={};
    if(notifs) notifs.forEach(function(n){
      var dest=NOTIF_PAGE[n.tipo];
      if(dest) destinos[dest]=true;
    });

    // Ponto em Dashboard (mobile)
    var ddash=document.getElementById('mob-dot-dashboard');
    if(ddash) ddash.style.display=destinos['dashboard-owner.html']?'inline-block':'none';

    // Ponto em Meus Planos (mobile)
    var dmp=document.getElementById('mob-dot-meusplanos');
    if(dmp) dmp.style.display=destinos['meus-planos.html']?'inline-block':'none';

    // ── DESKTOP: badge nos botões do nav ──
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

    // ── MARCAR COMO LIDAS ao chegar na página destino ──
    var tiposDestaPagina=Object.keys(NOTIF_PAGE).filter(function(t){
      return NOTIF_PAGE[t]===PAGE;
    });
    if(tiposDestaPagina.length&&notifs&&notifs.length){
      var ids=notifs
        .filter(function(n){return tiposDestaPagina.indexOf(n.tipo)!==-1;})
        .map(function(n){return n.id;});
      if(ids.length){
        fetch(SBU+'/rest/v1/notificacoes?id=in.('+ids.join(',')+')',{
          method:'PATCH',
          headers:{
            'apikey':SBK,
            'Authorization':'Bearer '+SBK,
            'Content-Type':'application/json',
            'Prefer':'return=minimal'
          },
          body:JSON.stringify({lida:true})
        });
      }
    }
  }

  // CSS inline para ham-dot e mob-lnk-dot
  var style=document.createElement('style');
  style.textContent=[
    '#ham-dot{position:absolute;top:5px;right:5px;width:9px;height:9px;',
    'border-radius:50%;background:#e74c3c;display:none;border:2px solid #fff;z-index:2;}',
    '#ham-dot.show{display:block;}',
    '.mob-lnk-dot{display:inline-block;width:8px;height:8px;border-radius:50%;',
    'background:#e74c3c;margin-left:6px;vertical-align:middle;}'
  ].join('');
  document.head.appendChild(style);

  // Aguardar DOM + Supabase estar pronto, depois iniciar polling
  function start(){
    poll();
    setInterval(poll,2000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start);
  } else {
    setTimeout(start,500); // pequeno delay para Supabase inicializar
  }
})();

(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Three-dimensional portal and galaxy scenes. CSS remains as a graceful fallback.
  function createSpaceScene(canvas, mode) {
    if (!canvas || !window.THREE) return null;
    let renderer, scene, camera, galaxy, portal, stars, core, frame = 0, disposed = false;
    const THREE = window.THREE;
    try {
      renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
      renderer.outputEncoding = THREE.sRGBEncoding;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(42, (canvas.clientWidth || 800)/(canvas.clientHeight || 600), .1, 1000);
      camera.position.set(0, 0, mode === 'portal' ? 12 : 10);
      const ambient = new THREE.AmbientLight(0x9b8acb, .8); scene.add(ambient);
      const point = new THREE.PointLight(0xe7c58d, 2.2, 35); point.position.set(0,0,5); scene.add(point);
      const group = new THREE.Group(); scene.add(group);
      // Spiral-arm particle field.
      const count = mode === 'portal' ? 11500 : 14500;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const colorA = new THREE.Color(0x9b83d9), colorB = new THREE.Color(0xe6c997), colorC = new THREE.Color(0x82b8d4);
      for (let i=0;i<count;i++) {
        const radius = Math.pow(Math.random(), .62) * (mode === 'portal' ? 5.1 : 4.2);
        const arm = i % 4;
        const angle = arm * Math.PI/2 + radius * 1.23 + (Math.random()-.5) * (0.42 + radius*.10);
        const thick = (Math.random()-.5) * (.12 + radius*.09);
        positions[i*3] = Math.cos(angle)*radius + Math.cos(angle+Math.PI/2)*thick;
        positions[i*3+1] = Math.sin(angle)*radius*.58 + Math.sin(angle+Math.PI/2)*thick*.65;
        positions[i*3+2] = (Math.random()-.5) * (.18 + radius*.07);
        const mix = Math.random();
        const c = mix < .58 ? colorA : (mix < .83 ? colorB : colorC);
        const intensity = .45 + Math.random()*.65;
        colors[i*3] = c.r*intensity; colors[i*3+1] = c.g*intensity; colors[i*3+2] = c.b*intensity;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
      const material = new THREE.PointsMaterial({size: mode === 'portal' ? .025 : .022, vertexColors:true, transparent:true, opacity:.9, depthWrite:false, blending:THREE.AdditiveBlending});
      galaxy = new THREE.Points(geo,material); galaxy.rotation.x = .22; group.add(galaxy);
      const coreGeo = new THREE.SphereGeometry(.28,32,32);
      const coreMat = new THREE.MeshBasicMaterial({color:0xffe6b4});
      core = new THREE.Mesh(coreGeo,coreMat); group.add(core);
      const glow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({color:0xe7c58d,size:.11,transparent:true,opacity:.45}));
      const glowPos = new Float32Array(450*3);
      for(let i=0;i<450;i++){const a=Math.random()*Math.PI*2,r=Math.random()*.75;glowPos[i*3]=Math.cos(a)*r;glowPos[i*3+1]=Math.sin(a)*r;glowPos[i*3+2]=(Math.random()-.5)*.3;}
      glow.geometry.setAttribute('position',new THREE.BufferAttribute(glowPos,3)); group.add(glow);
      // A luminous ringed portal on the opening scene.
      if(mode === 'portal'){
        portal = new THREE.Group(); scene.add(portal);
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.0,.035,12,180),new THREE.MeshBasicMaterial({color:0xb7a0ee,transparent:true,opacity:.8}));
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.35,.012,8,180),new THREE.MeshBasicMaterial({color:0xe8ca98,transparent:true,opacity:.55}));
        ring1.rotation.x = .27; ring2.rotation.x = .27; ring2.rotation.y = .12;
        portal.add(ring1,ring2); group.scale.set(1.06,1.06,1);
      } else {
        group.scale.set(.92,.92,.92);
      }
      // Background stars.
      const starCount = 1800, starPos = new Float32Array(starCount*3);
      for(let i=0;i<starCount;i++){starPos[i*3]=(Math.random()-.5)*34;starPos[i*3+1]=(Math.random()-.5)*22;starPos[i*3+2]=(Math.random()-.5)*20-5;}
      const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
      stars = new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xcbd5ff,size:.018,transparent:true,opacity:.72})); scene.add(stars);
      let targetX=0,targetY=0,dragging=false,lastX=0,lastY=0,zoom=1;
      const pointerMove = e => {
        const rect=canvas.getBoundingClientRect();
        if(dragging && mode !== 'portal'){targetY += (e.clientX-lastX)*.005;targetX += (e.clientY-lastY)*.004;lastX=e.clientX;lastY=e.clientY;}
        else if(mode === 'portal'){targetY=(e.clientX-rect.left)/rect.width-.5;targetX=(e.clientY-rect.top)/rect.height-.5;}
      };
      const down=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;if(canvas.setPointerCapture)canvas.setPointerCapture(e.pointerId);};
      const up=()=>{dragging=false;};
      const wheel=e=>{if(mode!=='portal'){e.preventDefault();zoom=Math.max(.72,Math.min(1.55,zoom+e.deltaY*.0007));}};
      canvas.addEventListener('pointermove',pointerMove);
      canvas.addEventListener('pointerdown',down);
      canvas.addEventListener('pointerup',up);
      canvas.addEventListener('pointercancel',up);
      canvas.addEventListener('wheel',wheel,{passive:false});
      const resize=()=>{
        if(disposed)return;
        const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
        renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
      };
      const observer=new ResizeObserver(resize); observer.observe(canvas);
      const animate=()=>{
        if(disposed)return;
        frame=requestAnimationFrame(animate);
        const t=performance.now()*.00025;
        if(!reducedMotion){
          galaxy.rotation.z += mode==='portal' ? .00065 : .00035;
          group.rotation.y += (targetY-group.rotation.y)*.035;
          group.rotation.x += ((targetX*.55)-group.rotation.x)*.035;
          if(portal){portal.rotation.z=-t*.45;portal.rotation.x=.25+Math.sin(t*2)*.035;}
          stars.rotation.z=t*.015;
          core.scale.setScalar(1+Math.sin(t*8)*.035);
        }
        if(mode!=='portal')camera.position.z=10/zoom;
        else {camera.position.x += (targetY*.65-camera.position.x)*.012;camera.position.y += (-targetX*.45-camera.position.y)*.012;}
        renderer.render(scene,camera);
      };
      animate();
      return {
        reset(){targetX=0;targetY=0;zoom=1;group.rotation.set(0,0,0);camera.position.set(0,0,10);},
        destroy(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);renderer.dispose();}
      };
    } catch (error) {
      console.warn('3D scene unavailable; using visual fallback.',error);
      return null;
    }
  }

  const portalScene=createSpaceScene($('#portalCanvas'),'portal');
  let explorerScene=createSpaceScene($('#explorerCanvas'),'explorer');

  // Navigation, scroll progress and mobile drawer.
  const sidebar=$('#sidebar'), menu=$('#menuToggle'), navLinks=$$('.nav-link'), sections=$$('main section[id]');
  menu.addEventListener('click',()=>sidebar.classList.toggle('open'));
  navLinks.forEach(link=>link.addEventListener('click',()=>sidebar.classList.remove('open')));
  const backTop=$('#backTop');
  const progressLabel=$('#progressLabel');
  const sectionIds=['explorer','types','milkyway','deep-space','observatory','academy'];
  const seen=new Set();
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting && sectionIds.includes(entry.target.id)){
        seen.add(entry.target.id);
        navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+entry.target.id));
        progressLabel.textContent=String(seen.size).padStart(2,'0')+' / 06 DISCOVERED';
      }
    });
  },{threshold:.32});
  sections.forEach(s=>observer.observe(s));
  window.addEventListener('scroll',()=>backTop.classList.toggle('visible',window.scrollY>650),{passive:true});
  backTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:reducedMotion?'auto':'smooth'}));
  $('#resetView').addEventListener('click',()=>{if(explorerScene)explorerScene.reset();});

  // Galaxy explorer profiles.
  const objects={
    spiral:{name:'Spiral Galaxy',description:'Thiên hà xoắn ốc có đĩa dẹt, vùng phình trung tâm và các cánh tay xoắn chứa nhiều sao, khí và bụi.',shape:'Disk + spiral arms',example:'Milky Way · M31'},
    elliptical:{name:'Elliptical Galaxy',description:'Thiên hà elip có hình dạng gần cầu hoặc elip, thường có ít khí lạnh và bụi hơn các thiên hà xoắn ốc, với quần thể sao tương đối già.',shape:'Smooth ellipsoid',example:'M87 · M49'},
    irregular:{name:'Irregular Galaxy',description:'Thiên hà bất quy tắc không có cấu trúc xoắn ốc hay elip rõ ràng. Hình dạng có thể chịu ảnh hưởng bởi tương tác hấp dẫn và hoạt động tạo sao.',shape:'No regular shape',example:'LMC · NGC 1427A'}
  };
  $$('.object-choice').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.object-choice').forEach(b=>b.classList.toggle('active',b===btn));
    const o=objects[btn.dataset.object];
    $('#objectName').textContent=o.name;$('#objectDescription').textContent=o.description;$('#objectShape').textContent=o.shape;$('#objectExample').textContent=o.example;
    if(explorerScene)explorerScene.reset();
  }));

  // Classification tabs and their explanations.
  const types={
    spiral:{eyebrow:'HUBBLE CLASSIFICATION · SA–SB–SC',title:'Spiral',text:'Thiên hà xoắn ốc có một đĩa tương đối phẳng, vùng phình trung tâm và các cánh tay xoắn. Những cánh tay này thường nổi bật nhờ các sao trẻ, vùng khí và bụi, cùng hoạt động hình thành sao.',structure:'Disk · Bulge · Arms',examples:'Milky Way · Andromeda',tip:'Hãy tưởng tượng một chiếc chong chóng khổng lồ được tạo nên từ hàng tỷ ngôi sao.'},
    elliptical:{eyebrow:'HUBBLE CLASSIFICATION · E0–E7',title:'Elliptical',text:'Thiên hà elip có hình dạng từ gần cầu đến elip dẹt. Chúng thường có bề mặt sáng khá trơn, ít khí lạnh và bụi hơn thiên hà xoắn ốc, đồng thời chứa nhiều sao già.',structure:'Smooth · Rounded · Halo',examples:'M87 · M49',tip:'Không có cánh tay xoắn nổi bật — cấu trúc của chúng trông mượt và tương đối đồng đều.'},
    irregular:{eyebrow:'IRREGULAR MORPHOLOGY',title:'Irregular',text:'Thiên hà bất quy tắc không có hình dạng đối xứng rõ ràng. Một số có nhiều vùng khí và bụi, nơi sao mới hình thành; tương tác với thiên hà khác có thể góp phần làm biến dạng cấu trúc.',structure:'Asymmetric · Complex',examples:'LMC · NGC 1427A',tip:'Không theo một khuôn mẫu cố định, nhưng vẫn là những hệ thống được liên kết bởi hấp dẫn.'}
  };
  $$('.type-tab').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.type-tab').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-selected',b===btn?'true':'false');});
    const t=types[btn.dataset.type];
    $('#typeEyebrow').textContent=t.eyebrow;$('#typeTitle').innerHTML=t.title+' <em>Galaxy</em>';$('#typeText').textContent=t.text;$('#typeStructure').textContent=t.structure;$('#typeExamples').textContent=t.examples;$('#typeTip').textContent=t.tip;
    $('#typeArt').className='type-art-large '+(btn.dataset.type==='spiral'?'spiral-art-large':btn.dataset.type);
  }));

  // Interactive Milky Way map.
  const milky={
    core:{title:'Galactic Center',text:'Vùng trung tâm Ngân Hà có mật độ sao cao. Tại đây có Sagittarius A*, một lỗ đen siêu nặng với khối lượng khoảng bốn triệu lần Mặt Trời.'},
    sun:{title:'Solar System',text:'Hệ Mặt Trời nằm trong vùng đĩa thiên hà, cách tâm Ngân Hà khoảng 26.000 năm ánh sáng. Vị trí của chúng ta thuộc vùng lân cận Mặt Trời trên nhánh Orion.'},
    orion:{title:'Orion Arm',text:'Nhánh Orion là một cấu trúc dạng nhánh nhỏ nằm giữa các nhánh xoắn ốc lớn hơn. Hệ Mặt Trời nằm trong vùng địa phương của nhánh này.'}
  };
  $$('.map-point').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.map-point').forEach(b=>b.classList.toggle('active',b===btn));
    $('#milkyTitle').textContent=milky[btn.dataset.point].title;$('#milkyText').textContent=milky[btn.dataset.point].text;
  }));

  // Five-question quiz with explanations and local progress.
  const questions=[
    {q:'Thiên hà được liên kết với nhau chủ yếu bởi lực nào?',a:['Lực ma sát','Lực hấp dẫn','Lực đẩy điện','Áp suất ánh sáng'],correct:1,why:'Lực hấp dẫn giữ các ngôi sao, khí, bụi và vật chất tối liên kết trong một hệ thống thiên hà.'},
    {q:'Ngân Hà thuộc nhóm thiên hà nào?',a:['Xoắn ốc có thanh','Elip','Bất quy tắc','Thấu kính'],correct:0,why:'Ngân Hà được phân loại là thiên hà xoắn ốc có thanh, với vùng thanh ở trung tâm và các nhánh xoắn.'},
    {q:'Andromeda cách Ngân Hà khoảng bao xa?',a:['2.500 năm ánh sáng','25.000 năm ánh sáng','2,5 triệu năm ánh sáng','250 triệu năm ánh sáng'],correct:2,why:'Andromeda nằm cách chúng ta khoảng 2,5 triệu năm ánh sáng.'},
    {q:'Vì sao nhìn một thiên hà rất xa cũng là nhìn về quá khứ?',a:['Thiên hà phát sáng chậm','Ánh sáng cần thời gian để truyền đi','Kính thiên văn làm ảnh cũ đi','Vũ trụ đứng yên'],correct:1,why:'Ánh sáng có tốc độ hữu hạn. Ánh sáng từ vật thể xa đã khởi hành từ rất lâu trước khi đến kính thiên văn.'},
    {q:'Kính thiên văn James Webb chủ yếu quan sát ở vùng nào của phổ điện từ?',a:['Sóng vô tuyến','Tia gamma','Ánh sáng tử ngoại','Hồng ngoại'],correct:3,why:'James Webb được tối ưu cho thiên văn học hồng ngoại, giúp quan sát các thiên hà xa và vùng hình thành sao.'}
  ];
  let qIndex=0,score=0,answered=false;
  const savedScore=Number(localStorage.getItem('galaxyAtlasBest')||0);
  function renderQuestion(){
    const q=questions[qIndex];answered=false;
    $('#quizQuestion').textContent=q.q;$('#quizCount').textContent='QUESTION '+String(qIndex+1).padStart(2,'0')+' / 05';
    $('#quizProgress').style.width=((qIndex)/questions.length*100)+'%';$('#quizScore').textContent='SCORE '+score;
    $('#quizFeedback').textContent='';$('#quizNext').disabled=true;$('#quizNext').innerHTML='CONTINUE <span>→</span>';
    const box=$('#quizOptions');box.innerHTML='';
    q.a.forEach((answer,i)=>{
      const b=document.createElement('button');b.className='quiz-option';b.textContent=String.fromCharCode(65+i)+'.  '+answer;
      b.addEventListener('click',()=>chooseAnswer(i));box.appendChild(b);
    });
  }
  function chooseAnswer(choice){
    if(answered)return;answered=true;
    const q=questions[qIndex],buttons=$$('.quiz-option');
    buttons.forEach((b,i)=>{b.disabled=true;if(i===q.correct)b.classList.add('correct');else if(i===choice)b.classList.add('wrong');});
    if(choice===q.correct){score++;$('#quizFeedback').textContent='CHÍNH XÁC — '+q.why;}
    else $('#quizFeedback').textContent='CHƯA ĐÚNG — '+q.why;
    $('#quizScore').textContent='SCORE '+score;$('#quizNext').disabled=false;
    $('#quizNext').innerHTML=qIndex===questions.length-1?'VIEW RESULTS <span>→</span>':'NEXT QUESTION <span>→</span>';
  }
  function finishQuiz(){
    $('#quizContent').classList.add('hidden');$('#quizResult').classList.remove('hidden');
    $('#quizProgress').style.width='100%';$('#quizCount').textContent='MISSION COMPLETE';
    const pct=Math.round(score/questions.length*100);
    $('#resultTitle').textContent=pct>=80?'Excellent exploration.':pct>=60?'A promising discovery.':'Keep exploring.';
    $('#resultText').textContent='Bạn trả lời đúng '+score+'/5 câu ('+pct+'%). '+(pct>=80?'Bạn đã nắm được nhiều kiến thức nền tảng về thiên hà.':'Hãy xem lại các khu vực khám phá và thử lại nhé.');
    const best=Math.max(score,savedScore);localStorage.setItem('galaxyAtlasBest',String(best));
    $('#achievementStatus').textContent='UNLOCKED';$('#achievementStatus').parentElement.classList.add('unlocked');
    $('#observerStatus').textContent=seen.size>=4?'UNLOCKED':'IN PROGRESS';
    if(seen.size>=4)$('#observerStatus').parentElement.classList.add('unlocked');
    $('#quizScore').textContent='BEST '+best+'/5';
  }
  $('#quizNext').addEventListener('click',()=>{if(!answered)return;if(qIndex<questions.length-1){qIndex++;renderQuestion();}else finishQuiz();});
  $('#restartQuiz').addEventListener('click',()=>{qIndex=0;score=0;$('#quizContent').classList.remove('hidden');$('#quizResult').classList.add('hidden');renderQuestion();});
  renderQuestion();
  if(savedScore>0){$('#achievementStatus').textContent='BEST '+savedScore+'/5';}

  // Smooth fallback for missing WebGL.
  if(!window.THREE){$('#portalCanvas').style.display='none';$('#explorerCanvas').style.display='none';}
})();
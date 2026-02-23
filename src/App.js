import React, { useState, useEffect, useRef, Suspense } from 'react';
import './App.css';
import { v4 as uuidv4 } from 'uuid';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';

function Model({ url }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef();

  // Handle left and right arrow keys
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (modelRef.current) {
        switch (event.key) {
          case 'ArrowLeft':
            modelRef.current.rotation.y -= 0.1;
            break;
          case 'ArrowRight':
            modelRef.current.rotation.y += 0.1;
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle phone gyroscope
  useEffect(() => {
    const handleOrientation = (event) => {
      if (modelRef.current) {
        const gamma = event.gamma;
        const rotation = (gamma / 90) * Math.PI;
        modelRef.current.rotation.y = rotation;
      }
    };

    const requestPermission = async () => {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const permission = await DeviceMotionEvent.requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        } catch (error) {
          console.error('DeviceMotionEvent permission request failed', error);
        }
      } else {
        // For browsers that don't require explicit permission
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Handle scroll to rotate
  useEffect(() => {
    const handleScroll = () => {
      if (modelRef.current) {
        const scrollPosition = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const rotation = (scrollPosition / maxScroll) * 2 * Math.PI; // Full 360 degrees rotation
        modelRef.current.rotation.y = rotation;
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return <primitive object={scene} position={[0, -1.6, 0]} ref={modelRef} />;
}

const App = () => {
  // const [isScrolling, setIsScrolling] = useState(false);
  // const videoRef = useRef(null);
  // const timeoutIdRef = useRef(null);

  const [activeSection, setActiveSection] = useState(null);
  const sectionRefs = useRef([null, null, null, null, null]);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [sessionUUID, setSessionUUID] = useState('');

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && message.trim() !== '') {
      handleSend();
    }
  };


  const adjustTextAreaHeight = (element) => {
    element.style.height = 'auto';
    if (element.value === '') {
      element.style.height = '20px';
    } else {
      element.style.height = `${element.scrollHeight}px`;
    }
  };

  useEffect(() => {
    const newUUID = uuidv4();
    setSessionUUID(newUUID);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;

      sectionRefs.current.forEach((sectionRef, index) => {
        if (sectionRef) {
          const { offsetTop, offsetHeight } = sectionRef;

          if (scrollPosition + windowHeight >= offsetTop + offsetHeight / 2 && scrollPosition < offsetTop + offsetHeight / 2) {
            setActiveSection(index);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);


  useEffect(() => {
    const handleScrollAnimation = () => {
      const boxes = document.querySelectorAll('.box');

      boxes.forEach(box => {
        const boxTop = box.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;

        if (boxTop < windowHeight * 0.8) {
          box.classList.add('animate');
        } else {
          box.classList.remove('animate');
        }
      });
    };

    window.addEventListener('scroll', handleScrollAnimation);

    return () => {
      window.removeEventListener('scroll', handleScrollAnimation);
    };
  }, []);

  const scrollToSection = (index) => {
    sectionRefs.current[index].scrollIntoView({ behavior: 'smooth' });
  };


  function markdownToHtml(markdown) {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  const sendMessage = (sessionUUID, message, feedback) => {
    setLoading(true);
    return new Promise((resolve, reject) => {
      let formData = new FormData();
      formData.append('session_uuid', sessionUUID);
      formData.append('message', message);
      formData.append('feedback', feedback);

      fetch('http://Dabster.pythonanywhere.com/send_message', {
        method: 'POST',
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          setLoading(false);
          let htmlResponse = markdownToHtml(data.response);
          setMessages(prevMessages => [
            ...prevMessages,
            { html: htmlResponse, sender: 'bot', id: Date.now().toString() },
          ]);
          // startPlaying();
          resolve();
        })
        .catch((error) => {
          setLoading(false);
          console.error('Fetch error:', error);
          reject(error);
        });
    });
  };

  const handleSend = (customMessage = null) => {
    if (loading || (message.trim() === '' && !customMessage)) {
      return;
    }

    const finalMessage = customMessage || message;

    setMessages(prevMessages => [
      ...prevMessages,
      { text: finalMessage, sender: 'user', id: Date.now().toString() },
    ]);
    setMessage('');

    setLoading(true);

    sendMessage(sessionUUID, finalMessage, feedback)
      .then(() => {
        setTimeout(() => {
          setLoading(false);
          setFeedback(null); // Reset feedback after sending the message
        }, 1);
      })
      .catch(() => {
        setLoading(false);
        // Handle error if needed
      });
  };

  return (
    <div className="app" >
      <div className='nav'>
        <p className={activeSection === 0 ? 'active' : 'normal'} onClick={() => scrollToSection(0)}>About Me</p>
        <p className={activeSection === 1 ? 'active' : 'normal'} onClick={() => scrollToSection(1)}>Skills</p>
        <p className={activeSection === 2 ? 'active' : 'normal'} onClick={() => scrollToSection(2)}>Background</p>
        <p className={activeSection === 3 ? 'active' : 'normal'} onClick={() => scrollToSection(3)}>Experience</p>
        <p className={activeSection === 4 ? 'active' : 'normal'} onClick={() => scrollToSection(4)}>Projects</p>
        <p className={activeSection === 5 ? 'active' : 'normal'} onClick={() => scrollToSection(5)}>Contact Me</p>
      </div>
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#e7e3d8', position: 'fixed', zIndex: -1 }}>
        <Canvas camera={{ position: [10, 4.5, 5] }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <Model url="model.gltf" />
            <OrbitControls enableZoom={false} enableRotate={false} /> {/* Disable zoom and rotation */}
          </Suspense>
        </Canvas>
      </div>
      <div className="container">
        <h1 className='head'>SAHIL SAWANT</h1>
        <p className='sub-head'>AI/ML Developer | Full Stack Developer</p>
      </div>
      <div className='scrolling'>
        <div className='box' id="aboutMe" ref={el => sectionRefs.current[0] = el}>
          <h1 className='box-head'>About Me</h1>
          <p className='about'>I am Sahil Sawant, a seasoned <span>full-stack developer, AI/ML engineer, and data scientist/analyst</span> with a robust background in a wide array of technologies. My expertise spans multiple programming languages and frameworks, including <span>React.js, React Native, HTML5, CSS3, PHP, SQL, Bootstrap 5.2, and Python</span>. I also specialize in data analytics tools like <span>Power BI and Tableau.</span><br /><br />
            In the AI and machine learning realm, I'm proficient in <span>Generative AI</span> and a diverse range of ML algorithms. I've worked with technologies such as<span> Flask, Hugging Face, OpenCV, Pandas, LangChain, OpenAI, Google Generative AI, TensorFlow, and Tesseract OCR</span>. My experience extends to image generation, processing, and the use of Faiss vector stores.<br /><br />
            I also have hands-on experience with <span>Retool, Microsoft Azure AI Services, AWS, and Git,</span> ensuring I'm equipped to handle both front-end and back-end development tasks. </p>
        </div>
        <div className='box' id="skills" ref={el => sectionRefs.current[1] = el}>
          <h1 className='box-head'>Skills</h1>
          <div className='skill'>
            <div className='skill-item'>
              <img src='images/ai.webp' alt='ai-img' className='icon' />
              <p className='skill-text'>AI</p>
            </div>
            <div className='skill-item'>
              <img src='images/chat.webp' alt='chatai-img' className='icon' />
              <p className='skill-text'>OpenAI</p>
            </div>
            <div className='skill-item'>
              <img src='images/html-5.webp' alt='html-img' className='icon' />
              <p className='skill-text'>HTML5</p>
            </div>
            <div className='skill-item'>
              <img src='images/css-3.webp' alt='css-img' className='icon' />
              <p className='skill-text'>CSS3</p>
            </div>
            <div className='skill-item'>
              <img src='images/react.webp' alt='react-img' className='icon' />
              <p className='skill-text'>React.Js</p>
            </div>
            <div className='skill-item'>
              <img src='images/nodejs.webp' alt='-img' className='icon' />
              <p className='skill-text'>Node.JS</p>
            </div>
            <div className='skill-item'>
              <img src='images/bootstrap.webp' alt='bootstrap-img' className='icon' />
              <p className='skill-text'>Bootstrap</p>
            </div>
            <div className='skill-item'>
              <img src='images/php.webp' alt='php-img' className='icon' />
              <p className='skill-text'>PHP</p>
            </div>
            <div className='skill-item'>
              <img src='images/python.webp' alt='python-img' className='icon' />
              <p className='skill-text'>Python</p>
            </div>
            <div className='skill-item'>
              <img src='images/sql.webp' alt='sql-img' className='icon' />
              <p className='skill-text'>MySQL</p>
            </div>
            <div className='skill-item'>
              <img src='images/power-bi.webp' alt='powerbi-img' className='icon' />
              <p className='skill-text'>PowerBI</p>
            </div>
            <div className='skill-item'>
              <img src='images/tableau.webp' alt='tableau-img' className='icon' />
              <p className='skill-text'>Tableau</p>
            </div>
          </div>
        </div>
        <div className='box' id="background" ref={el => sectionRefs.current[2] = el}>
          <h1 className='box-head'>Background</h1>
          <div>
            <h1 className='background-text'>• Bachelor of Vocational Studies in Artififcial Intelligence & Data Science
              <br />➡ Thakur College of Engineering & Technology - 2024
            </h1>
            <h1 className='background-text'>• Higher Secondary Education (HSC-12th)
              <br />➡ Sathaye College - 2019</h1>
          </div>
        </div>
        <div className='box' id="experience" ref={el => sectionRefs.current[3] = el}>
          <h1 className='box-head'>Experience</h1>
          <h1 className='exp-head'>Machine Learning Developer - TRRAIN Circle</h1>
          <div className='exp-text'>
            <p>• Developed Misraji LLM-based chatbot to address queries related to kirana stores, leveraging
              React.js and React Native for frontend development.
              <br />• Conducted data cleaning, analysis, and testing for ML models, ensuring accuracy and
              efficiency in operations.
              <br />• Integrated Microsoft Azure AI Services, including text-to-speech (TTS) and speech-to-text
              (STT), enhancing chatbot functionalities.
              <br />• Implemented advanced techniques such as image processing, OCR, augmentation, and
              image matching to optimize performance and user experience.
              <br />• Utilized vision-to-text LLM technologies like LLAVA and Vision API by OpenAI for enhanced
              functionality and versatility.
            </p>
          </div>
          <h1 className='exp-head'>Full Stack Developer - Grain Analytics</h1>
          <div className='exp-text'>
            <p>• Developed robust systems utilizing Google's suite of APIs including Maps API, Distance Matrix API, Places API, and others to integrate different services into web applications.
              <br />• Developed methods for retrieving data from several sources, processed unprocessed data, carried out data analysis, and provided insights to front-end React apps.
              <br />• Using Plotly and Chart.js in React, dynamic visualizations were designed and deployed to efficiently depict data trends and patterns. These visualizations included interactive charts, intricate heatmaps, and conjoined line graphs.
              <br />• Deployed Gemini chatbot technology to improve customer satisfaction and operational efficiency by easing application procedures and enhancing user interaction.
            </p>
          </div>
        </div>
        <div className='box' id="projects" ref={el => sectionRefs.current[4] = el}>
          <h1 className='box-head'>Projects</h1>
          <div className='exp-div'>
            <h1 className='exp-head'>FitGenie - LLM Based Chatbot</h1>
            <a href='https://fitfrenzy.42web.io' className='button-link'><button >Visit Now →</button></a>
          </div>
          <div className='exp-text'>
            <p>• Description: Designed and implemented FitGenie, a chatbot powered by Gemini LLM API, offering
              comprehensive fitness solutions.
              <br />• Functionality: Provides answers to various fitness-related queries including personalized diet plans,
              custom exercise routines, supplement recommendations, exercise guidance, and athlete-specific
              training programs.
              <br />• Technologies Used: Gemini LLM, Python, React.js, Local API
            </p>
          </div>
          <div className='main-div'>
            {messages.map((item, index) => (
              <div key={index} className="message-container">
                <div style={{ display: 'flex', marginTop: 10 }}>
                  <div className={item.sender === 'user' ? 'user-message' : 'bot-message'}>
                    {item.sender === 'user' ? item.text : <p className='message-text' dangerouslySetInnerHTML={{ __html: item.html }} />}
                  </div>
                </div>
                {/* Show loader after user's message while waiting for bot's response */}
                {item.sender === 'user' && loading && index === messages.length - 1 && (
                  <div className="card">
                    <div className="card__skeleton card__title"></div>
                    <div className="card__skeleton card__description"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="chat-input-container">
            <textarea
              placeholder='Try FitGenie Here'
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onInput={(e) => adjustTextAreaHeight(e.target)}
              onKeyPress={handleKeyPress}
              className="chat-input"
              style={{ height: 20, color: 'black', }}
            />
            <button onClick={() => {
              handleSend();
            }}
              disabled={loading}
              style={{ opacity: loading ? 0.5 : 1, marginLeft: 10 }}
            >
              <img className="send-icon" src="images/send.webp" alt="Send" />
            </button>
          </div>
          <div className='exp-div'>
            <h1 className='exp-head'>Old Portfolio Website</h1>
            <a href='https://old.sahilsawant.42web.io' className='button-link'><button >Visit Now →</button></a>
          </div>
          <div className='exp-text'>
            <p>• Description: Developed a personal portfolio website showcasing professional experience, skills, and
              projects.
              <br />• Technologies Used: HTML5, CSS3, JavaScript, Bootstrap 5
            </p>
          </div>

        </div>
        <div className='box' id="contactMe" ref={el => sectionRefs.current[5] = el}>
          <h1 className='box-head'>Contact Me</h1>
          <div className='contact'>
            <a href="https://www.linkedin.com/in/sahilsawant182"><img src='images/linkedin.webp' className='icon-contact' alt='linked-in icon' /></a>
            <a href="https://www.facebook.com/Sahil5926/"><img src='images/facebook.webp' className='icon-contact' alt='facebook icon' /></a>
            <a href="https://www.instagram.com/just.sahil_/"><img src='images/instagram.webp' className='icon-contact' alt='instagram icon' /></a>
            <a href="mailto:sahilsawant182@gmail.com"><img src='images/gmail.webp' className='icon-contact' alt='gmail icon' /></a>
            <a href="tel:+919082056583"><img src='images/phone.webp' className='icon-contact' alt='phone icon' /></a>
          </div>
        </div>
      </div>
      {/* <video ref={videoRef} className="background-video" autoPlay loop muted preload="metadata" poster="images/SS.webp">
        <source src="images/new3.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video> */}
    </div>
  );
};

export default App;

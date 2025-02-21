import { useState, useRef, useEffect } from 'react'
import './App.css'
import Groq from 'groq-sdk'
const API_KEY = import.meta.env.VITE_GROQ_API_KEY
const client = new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true })

function App() {
  const [text, setText] = useState('')
  const [words, setWords] = useState([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(300)
  const [estimatedTime, setEstimatedTime] = useState('')
  const [completionTime, setCompletionTime] = useState('')
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [canContinue, setCanContinue] = useState(true)
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false)
  const [showFullInterface, setShowFullInterface] = useState(true)
  const [lastQuizWordIndex, setLastQuizWordIndex] = useState(0)
  const intervalRef = useRef(null)
  const quizInterval = 200  // Se dispara el quiz cada 200 palabras
  const [remainingTime, setRemainingTime] = useState('')
  const [progress, setProgress] = useState(0)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSpeedChange = (newWpm) => {
    setWpm(newWpm)
    calculateEstimatedTime(words.length, newWpm)
  }

  const calculateEstimatedTime = (wordCount, speed) => {
    const minutes = Math.round(wordCount / speed)
    setEstimatedTime(`${minutes} minute${minutes !== 1 ? 's' : ''}`)
  }

  useEffect(() => {
    if (isPlaying && words.length > 0) {
      intervalRef.current = setInterval(async () => {
        setCurrentWordIndex((prevIndex) => {
          // Actualizamos el progreso y el tiempo restante
          const newProgress = ((prevIndex + 1) / words.length) * 100
          setProgress(newProgress)
          const remainingWords = words.length - (prevIndex + 1)
          const remainingMinutes = Math.round(remainingWords / wpm)
          setRemainingTime(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`)

          // Se verifica si ya transcurrió el intervalo para activar el quiz
          if ((prevIndex + 1) - lastQuizWordIndex >= quizInterval) {
            clearInterval(intervalRef.current)
            setIsPlaying(false)
            setShowQuiz(true)
            setLastQuizWordIndex(prevIndex + 1) // Marcamos que ya se mostró el quiz en este bloque

            const contextStart = Math.max(0, prevIndex - 49)
            const contextEnd = prevIndex + 1
            const context = words.slice(contextStart, contextEnd).join(' ')

            generateQuizQuestion(context).then(quizData => {
              if (quizData) {
                setQuizQuestions([quizData])
                setCurrentQuestionIndex(0)
                setCanContinue(true)
              } else {
                setShowQuiz(false)
                setIsPlaying(true)
              }
            })
            return prevIndex
          }

          // Finaliza la lectura si se han mostrado todas las palabras
          if (prevIndex >= words.length - 1) {
            clearInterval(intervalRef.current)
            setIsPlaying(false)
            setCompletionTime(`${Math.round(words.length / wpm)} minutes`)
            return prevIndex
          }

          return prevIndex + 1
        })
      }, (60 / wpm) * 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, words, wpm, lastQuizWordIndex])

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target.result
        setText(text)
        const wordArray = text.split(/\s+/).filter(word => word.length > 0)
        setWords(wordArray)
        calculateEstimatedTime(wordArray.length, wpm)
        setCurrentWordIndex(0)
        setLastQuizWordIndex(0)  // Reiniciamos el marcador del quiz para un nuevo archivo
        setIsPlaying(false)
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
      reader.readAsText(file)
    }
  }

  const handleAnswerSubmit = (answerIndex) => {
    const currentQuestion = quizQuestions[currentQuestionIndex]
    const isCorrect = answerIndex === currentQuestion.correctAnswer

    if (isCorrect) {
      // Al responder correctamente, ocultamos el quiz y avanzamos el índice para evitar reactivación inmediata
      setShowQuiz(false)
      setIsLoadingQuiz(false)
      setQuizQuestions([])
      setCurrentQuestionIndex(0)
      setCanContinue(true)
      setIsGeneratingQuiz(false)
      setCurrentWordIndex(prevIndex => prevIndex + 1)
      setIsPlaying(true)
    } else {
      // Si la respuesta es incorrecta, puedes mostrar un feedback o bloquear la continuidad
      setCanContinue(false)
    }
  }

  const toggleInterface = () => {
    setShowFullInterface(!showFullInterface)
  }

  return (
    <div className="speed-reader">
      <div className="content-wrapper">
        {showFullInterface && (
          <div className="upload-section">
            <div className="file-input-container">
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="file-input"
                id="file-input"
              />
              <label htmlFor="file-input" className="file-input-label">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Drag and drop your file here<br />or click to browse</span>
              </label>
            </div>
          </div>
        )}
        <div className="reader-section">
          {showQuiz ? (
            <div className="quiz-section">
              {isLoadingQuiz ? (
                <div className="loading-quiz">
                  <div className="loading-spinner"></div>
                  <p>Generando preguntas...</p>
                </div>
              ) : quizQuestions.length > 0 ? (
                <div className="question-card">
                  <h3>{quizQuestions[currentQuestionIndex].question}</h3>
                  <div className="options">
                    {quizQuestions[currentQuestionIndex].options.map((option, index) => (
                      <button
                        key={index}
                        className="option-button"
                        onClick={() => handleAnswerSubmit(index)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="word-display">
              <div className="current-word">
                {words[currentWordIndex] || 'Upload a text file to begin'}
              </div>
            </div>
          )}
          {showFullInterface && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
          {showFullInterface && completionTime && (
            <div className="completion-time">
              Reading completed in: {completionTime}
            </div>
          )}
          <div className="controls">
            <button className="control-button" onClick={togglePlayPause}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <div className="speed-control">
              <label>Speed: {wpm} WPM</label>
              <input
                type="range"
                min="100"
                max="1000"
                value={wpm}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                className="speed-slider"
              />
            </div>
            <button className="control-button" onClick={toggleInterface}>
              {showFullInterface ? 'Simple Mode' : 'Full Mode'}
            </button>
            {showFullInterface && estimatedTime && (
              <div className="reading-info">
                <div className="estimated-time">Estimated reading time: {estimatedTime}</div>
                {remainingTime && <div className="remaining-time">Remaining time: {remainingTime}</div>}
                <div className="progress-text">{Math.round(progress)}% completed</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const generateQuizQuestion = async (context) => {
  try {
    const prompt = `Given this text: ${context}\n\nGenerate a multiple choice question based on the text. If the text is in Spanish, generate the question in Spanish. Return ONLY a JSON object with these exact properties:\n{\n  "question": "your question here",\n  "options": ["option1", "option2", "option3", "option4"],\n  "correctAnswer": number between 0-3\n}\n\nDo not include any markdown formatting, code blocks, or additional text.`
    const completion = await client.chat.completions.create({
      messages: [{
        role: 'user',
        content: prompt
      }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) throw new Error('No response from API')

    try {
      const cleanedResponse = response.trim().replace(/^[`\s]*json\s*/, '').replace(/[`\s]*$/, '')
      const parsedResponse = JSON.parse(cleanedResponse)
      
      if (!parsedResponse.question || 
          !Array.isArray(parsedResponse.options) || 
          parsedResponse.options.length !== 4 || 
          typeof parsedResponse.correctAnswer !== 'number' ||
          parsedResponse.correctAnswer < 0 ||
          parsedResponse.correctAnswer > 3) {
        throw new Error('Invalid response format')
      }
      return parsedResponse
    } catch (e) {
      console.error('Failed to parse API response:', e)
      return null
    }
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('Rate limit exceeded. Please wait before trying again.')
      await new Promise(resolve => setTimeout(resolve, 2000))
      return generateQuizQuestion(context)
    }
    console.error('Error generating quiz question:', error)
    return null
  }
}

const validateApiKey = () => {
  if (!API_KEY || typeof API_KEY !== 'string' || !API_KEY.startsWith('gsk_')) {
    throw new Error('Invalid or missing API key. Please provide a valid Groq API key starting with gsk_')
  }
}

export default App

import { useState, useRef, useEffect } from 'react'
import './App.css'
import axios from 'axios'

const API_KEY = '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'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

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
  const intervalRef = useRef(null)
  const quizInterval = 200
  const [remainingTime, setRemainingTime] = useState('')
  const [progress, setProgress] = useState(0)

  const generateQuizQuestion = async (text) => {
    setIsLoadingQuiz(true)
    try {
      const response = await axios.post(
        API_URL,
        {
          messages: [
            {
              role: 'user',
              content: `Generate a multiple choice question about this text: ${text}. Format the response as a JSON object with properties: question (string), options (array of 4 strings), and correctAnswer (number 0-3 indicating the correct option index).`
            }
          ],
          model: 'openai/gpt-3.5-turbo'
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      const quizData = JSON.parse(response.data.choices[0].message.content)
      return quizData
    } catch (error) {
      console.error('Error generating quiz:', error)
      return null
    } finally {
      setIsLoadingQuiz(false)
    }
  }

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
      intervalRef.current = setInterval(() => {
        setCurrentWordIndex((prevIndex) => {
          const newProgress = ((prevIndex + 1) / words.length) * 100
          setProgress(newProgress)
          
          // Calculate remaining time
          const remainingWords = words.length - (prevIndex + 1)
          const remainingMinutes = Math.round(remainingWords / wpm)
          setRemainingTime(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`)
          
          if (prevIndex >= words.length - 1) {
            clearInterval(intervalRef.current)
            setIsPlaying(false)
            setCompletionTime(`${Math.round(words.length / wpm)} minutes`)
            return prevIndex
          }
          
          // Check if we should show a quiz
          if ((prevIndex + 1) % quizInterval === 0 && !showQuiz && canContinue) {
            setIsPlaying(false)
            setShowQuiz(true)
            const contextStart = Math.max(0, prevIndex - 100)
            const contextEnd = prevIndex + 1
            const context = words.slice(contextStart, contextEnd).join(' ')
            generateQuizQuestion(context).then(quizData => {
              if (quizData) {
                setQuizQuestions([quizData])
                setCurrentQuestionIndex(0)
              }
            })
          }
          
          return prevIndex + 1
        })
      }, (60 / wpm) * 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, words, wpm])

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
        setIsPlaying(false)
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
      reader.readAsText(file)
    }
  }

  const handleAnswerSubmit = (answerIndex) => {
    const currentQuestion = quizQuestions[currentQuestionIndex]
    const isCorrect = answerIndex === currentQuestion.correctAnswer
    setCanContinue(isCorrect)
    if (isCorrect) {
      setShowQuiz(false)
      setIsPlaying(true)
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
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
          {showQuiz && quizQuestions.length > 0 ? (
            <div className="quiz-section">
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
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                }}
              />
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

export default App

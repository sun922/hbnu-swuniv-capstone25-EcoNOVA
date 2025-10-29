import styles from './ShiftNotes.module.css';
import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

export default function ShiftNotes() {
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState('');

    useEffect(() => {
        // 기본 샘플 메모 데이터
        const sampleNotes = [
            {
                id: 1,
                text: '주간 교대 시작 - 오늘은 A4 용지 생산 예정입니다.',
                timestamp: '2025-01-10 06:00:00',
                shift: '주간'
            },
            {
                id: 2,
                text: '오후 교대 인수인계 - 품질 점검 완료, 정상 가동 중',
                timestamp: '2025-01-10 14:00:00',
                shift: '오후'
            },
            {
                id: 3,
                text: '야간 교대 - 설비 점검 및 청소 작업 완료',
                timestamp: '2025-01-10 22:00:00',
                shift: '야간'
            }
        ];
        setNotes(sampleNotes);
        
        // 로컬 스토리지에서 메모 불러오기 (샘플 데이터와 병합)
        const savedNotes = localStorage.getItem('shiftNotes');
        if (savedNotes) {
            const parsedNotes = JSON.parse(savedNotes);
            setNotes([...sampleNotes, ...parsedNotes]);
        }
    }, []);

    const saveNotes = (noteList) => {
        localStorage.setItem('shiftNotes', JSON.stringify(noteList));
        setNotes(noteList);
    };

    const addNote = () => {
        if (newNote.trim()) {
            const note = {
                id: Date.now(),
                text: newNote.trim(),
                timestamp: new Date().toLocaleString(),
                shift: getCurrentShift()
            };
            saveNotes([...notes, note]);
            setNewNote('');
        }
    };

    const deleteNote = (id) => {
        saveNotes(notes.filter(note => note.id !== id));
    };

    const startEdit = (note) => {
        setEditingId(note.id);
        setEditingText(note.text);
    };

    const saveEdit = () => {
        if (editingText.trim()) {
            saveNotes(notes.map(note => 
                note.id === editingId 
                    ? { ...note, text: editingText.trim(), timestamp: new Date().toLocaleString() }
                    : note
            ));
            setEditingId(null);
            setEditingText('');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingText('');
    };

    const getCurrentShift = () => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 14) return '주간';
        if (hour >= 14 && hour < 22) return '오후';
        return '야간';
    };
    const getShiftColor = (shift) => {
        const colors = {
            '주간': '#4CAF50',
            '오후': '#FF9800',
            '야간': '#2196F3'
        };
        return colors[shift] || '#666';
    };

    return (
        <div className={styles.memoWidget}>
            <div className={styles.memoHeader}>
                <h3>교대 메모</h3>
                <span className={styles.currentShift} style={{ color: getShiftColor(getCurrentShift()) }}>
                    {getCurrentShift()} 교대
                </span>
            </div>

            <div className={styles.memoInput}>
                <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="교대 메모를 입력하세요..."
                    rows="3"
                />
                <button onClick={addNote} className={styles.addButton}>
                    <FaPlus /> 추가
                </button>
            </div>

            <div className={styles.memoList}>
                {notes.length === 0 ? (
                    <div className={styles.emptyMemo}>메모가 없습니다.</div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className={styles.memoItem} data-shift={note.shift}>
                            <div className={styles.memoContent}>
                                {editingId === note.id ? (
                                    <div className={styles.editMode}>
                                        <textarea
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                            rows="2"
                                        />
                                        <div className={styles.editButtons}>
                                            <button onClick={saveEdit} className={styles.saveButton}>
                                                <FaSave /> 저장
                                            </button>
                                            <button onClick={cancelEdit} className={styles.cancelButton}>
                                                <FaTimes /> 취소
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles.memoText}>{note.text}</div>
                                        <div className={styles.memoMeta}>
                                            <span className={styles.memoShift} style={{ color: getShiftColor(note.shift) }}>
                                                {note.shift}
                                            </span>
                                            <span className={styles.memoTime}>{note.timestamp}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            {editingId !== note.id && (
                                <div className={styles.memoActions}>
                                    <button onClick={() => startEdit(note)} className={styles.editButton}>
                                        <FaEdit />
                                    </button>
                                    <button onClick={() => deleteNote(note.id)} className={styles.deleteButton}>
                                        <FaTrash />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import type { GLTFQueueItem } from '../types';
import { UploadCloud, CheckCircle2, AlertTriangle, Trash2, Box } from 'lucide-react';

interface ModelQueueProps {
  queue: GLTFQueueItem[];
  activeId: string | null;
  onSelectActive: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onUpload: (files: FileList) => void;
}

export default function ModelQueue({
  queue,
  activeId,
  onSelectActive,
  onRemoveItem,
  onUpload,
}: ModelQueueProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-4 animate-fadeIn" id="model-queue-container">
      {/* Drag and Drop Uploader Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="inset-panel-3d p-8 flex flex-col items-center justify-center cursor-pointer transition text-center group border-2 border-dashed hover:border-orange-500 hover:bg-orange-50/30"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".gltf,.glb"
          className="hidden"
        />
        <div className="w-12 h-12 rounded bg-orange-50 flex items-center justify-center border border-orange-200 group-hover:scale-105 transition mb-3">
          <UploadCloud className="w-5 h-5 text-orange-500" />
        </div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B2240] mb-1">Drag & Drop 3D Files</h4>
        <p className="text-[11px] text-gray-400 max-w-xs leading-normal">
          Supports <span className="text-[#0B2240] font-bold">.gltf / .glb</span> models up to 150MB. Click to browse.
        </p>
      </div>

      {/* Batch list Section */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest px-1">
          <span>Files in processing queue ({queue.length})</span>
          {queue.length > 0 && <span className="text-[9px] font-mono">Select to view</span>}
        </div>

        {queue.length === 0 ? (
          <div className="inset-panel-3d p-8 text-center text-gray-500 text-xs">
            No files currently loaded. Select or drag some GLTF/GLB files to start GIS georeferenced ortho-extraction.
          </div>
        ) : (
          <div className="max-h-[350px] overflow-y-auto space-y-2.5 pr-1" id="file-queue-scroll">
            {queue.map((item) => {
              const isActive = item.id === activeId;
              let statusBg = 'bg-gray-50 border-gray-200 text-gray-505';
              let statusText = 'Pending Setup';

              if (item.status === 'loading') {
                statusBg = 'bg-amber-50 border border-amber-200 text-amber-700 animate-pulse';
                statusText = `Parsing Buffer (${item.progress}%)`;
              } else if (item.status === 'rendering') {
                statusBg = 'bg-blue-50 border border-blue-200 text-blue-700 animate-pulse';
                statusText = 'Rendering Orthos...';
              } else if (item.status === 'completed') {
                statusBg = 'bg-emerald-50 border border-emerald-200 text-emerald-700';
                statusText = 'Ready / Processed';
              } else if (item.status === 'failed') {
                statusBg = 'bg-red-50 border border-red-200 text-red-700';
                statusText = 'Rendering Error';
              }

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectActive(item.id)}
                  className={`card-3d p-4 transition cursor-pointer flex flex-col gap-2 relative group/item overflow-hidden ${
                    isActive
                      ? 'border-orange-400 bg-orange-50/30'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-2.5 items-center min-w-0">
                      <div className={`p-2 rounded ${isActive ? 'bg-[#0B2240] text-white' : 'bg-gray-100 text-gray-400 group-hover/item:text-gray-750'}`}>
                        <Box className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-gray-800 truncate pr-4 leading-normal">{item.name}</h5>
                        <div className="flex gap-2 items-center text-[10px] text-gray-400 mt-0.5 font-mono">
                          <span>{formatSize(item.sizeBytes)}</span>
                          {item.dimensions && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-orange-600 font-bold uppercase tracking-wider text-[9px]">
                                {item.dimensions.width.toFixed(1)}m × {item.dimensions.depth.toFixed(1)}m
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item.id);
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Processing Status Badge */}
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border shadow-inner ${statusBg}`}>{statusText}</span>
                    
                    {item.status === 'completed' && item.renderedViews && item.renderedViews.length > 0 && (
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-bold font-sans">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {item.renderedViews.length} Orthos Exported
                      </span>
                    )}

                    {item.errorMessage && (
                      <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="truncate max-w-[120px]" title={item.errorMessage}>
                          {item.errorMessage}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progressive progress bar for active parsing/loading */}
                  {(item.status === 'loading' || item.status === 'rendering') && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
                      <div
                        className="h-full bg-orange-500 transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

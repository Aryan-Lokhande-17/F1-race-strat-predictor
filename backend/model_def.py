import torch
import torch.nn as nn

class HybridLSTM(nn.Module):
    def __init__(self, input_dim, hidden=128, layers=2, dropout=0.1):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden, num_layers=layers, batch_first=True, dropout=dropout)
        self.head = nn.Sequential(
            nn.Linear(hidden, hidden//2),
            nn.ReLU(),
            nn.Linear(hidden//2, 1)
        )

    def forward(self, x):
        out, _ = self.lstm(x)
        h = out[:, -1, :]
        return self.head(h).squeeze(-1)

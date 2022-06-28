import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';

interface Board {
  1: [string[]];
  2: [string[]];
  3: [string[]];
  4: [string[]];
  5: [string[]];
  6: [string[]];
  7: [string[]];
  8: [string[]];
  9: [string[]];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'sudoku-solver';
  puzzle: FormGroup;
  private SQUARE_COORDINATES = {
    1: [1, 1, 1, 2, 2, 2, 3, 3, 3],
    2: [1, 1, 1, 2, 2, 2, 3, 3, 3],
    3: [1, 1, 1, 2, 2, 2, 3, 3, 3],
    4: [4, 4, 4, 5, 5, 5, 6, 6, 6],
    5: [4, 4, 4, 5, 5, 5, 6, 6, 6],
    6: [4, 4, 4, 5, 5, 5, 6, 6, 6],
    7: [7, 7, 7, 8, 8, 8, 9, 9, 9],
    8: [7, 7, 7, 8, 8, 8, 9, 9, 9],
    9: [7, 7, 7, 8, 8, 8, 9, 9, 9],
  };
  private workingBoard: Board;

  constructor(private fb: FormBuilder) {
    this.puzzle = this.fb.group({
      1: this.buildForm(),
      2: this.buildForm(),
      3: this.buildForm(),
      4: this.buildForm(),
      5: this.buildForm(),
      6: this.buildForm(),
      7: this.buildForm(),
      8: this.buildForm(),
      9: this.buildForm(),
    });
  }

  buildForm() {
    const row = this.fb.array([]);
    for (let x = 0; x < 9; x++) {
      row.push(this.fb.control('0'));
    }
    return row;
  }

  solve() {
    this.workingBoard = JSON.parse(JSON.stringify(this.puzzle.value));

    let updated = true,
      solved = false;

    /*
        Easy-Hard are solved via iterations where we look at the current
        board and fill in any 100% guaranteed cells. We keep using the
        same board, and fill in the gaps until solved.

        Always do this first.  We can make the board simpler, even if we
        are unable to crack it entirely this way.
        Tests show doing this FIRST is quicker for Hard-Evil sudoko as it
        removes the number of blank cells ahead of the brute force.
    */
    while (updated && !solved) {
      updated = this.onValueCellConstraint(this.workingBoard);
      solved = this.isSolved(this.puzzle.value);
    }

    // Hard-Evil need brute force to finish off.
    if (!solved) {
      const board = this.backtrackBased(this.workingBoard);
      if (board) {
        solved = this.isSolved(board as Board);
      }
      if (solved) {
        this.puzzle.setValue(board as Board);
      }
    }
  }

  getRow(board: Board, row: string) {
    return board[row];
  }

  getColumn(board: Board, column: number): string[] {
    // iterate the rows to return a column. Columns are zero based
    const col: string[] = [];
    for (const prop in board) {
      col.push(board[prop][column]);
    }
    return col;
  }

  getSquare(board: Board, square: number): string[] {
    // given a square (see SQUARE_COORDINATES above) returns a square
    const cells: string[] = [];
    for (const prop in board) {
      for (let c = 0; c < 9; c++) {
        if (square == this.SQUARE_COORDINATES[prop][c]) {
          cells.push(board[prop][c]);
        }
      }
    }
    return cells;
  }

  // looks for all possible values for the cell
  // if there is a single value, it sets the cell to that value
  // if there are multiple values it sets the cell to an array containing all its possible values (e.g. [1, 4, 5])
  completeCell(board: Board, r: string, c: number): boolean {
    console.log('R: ', r, 'C: ', c);
    const row = this.getRow(board, r);
    const usedNumbers = [
      ...row,
      ...this.getColumn(board, c),
      ...this.getSquare(board, this.SQUARE_COORDINATES[r][c]),
    ];
    console.log(usedNumbers);
    const possibilities: string[] = [];
    for (let p = 1; p <= 9; p++) {
      if (!usedNumbers.includes(`${p}`)) {
        possibilities.push(`${p}`);
      }
    }
    console.log('possibilities: ', possibilities);
    if (possibilities.length == 1) {
      row[c] = possibilities[0];
      this.puzzle.get(r).setValue(row);
      this.workingBoard = JSON.parse(JSON.stringify(this.puzzle.value));
      console.log(this.puzzle.value);
      console.log(this.workingBoard);
      return true;
    } else {
      console.log('board[r][c]: ', board[r][c]);
      board[r][c] = possibilities;
      console.log('board[r][c]: ', board[r][c]);
      console.log(this.puzzle.value);
      console.log('board[r]', board[r]);
      console.log(board);
      return false;
    }
  }

  appearsOnlyOnce(
    possibilities: string[],
    row: string[],
    c: number,
    rowName: string
  ): boolean {
    let updated = false;
    const len = possibilities.length;
    for (let i = 0; i < len; i++) {
      const possibility = possibilities[i];
      let counter = 0;
      row.forEach((cell) => {
        if (Array.isArray(cell)) {
          if (cell.includes(possibility)) counter++;
        } else {
          if (cell == possibility) counter++;
        }
      });
      if (counter == 1) {
        row[c] = possibility;
        this.puzzle.get(rowName).setValue(row);
        this.workingBoard = JSON.parse(JSON.stringify(this.puzzle.value));
        updated = true;
        break;
      }
    }
    return updated;
  }

  compare(expected: string[], actual: string[]): boolean {
    const arr1 = expected.slice();
    let arr2 = actual.slice();
    return (
      arr1.length === arr2.length &&
      arr1.sort().every((value, index) => value === arr2.sort()[index])
    );
  }

  isSolved(board: Board) {
    const expected = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let valid = true;

    // Check all rows
    for (let r = 1; r < 10 && valid; r++) {
      if (!this.compare(expected, this.getRow(board, `${r}`))) valid = false;
    }

    // Check all columns
    for (let c = 0; c < 9 && valid; c++) {
      if (!this.compare(expected, this.getColumn(board, c))) valid = false;
    }

    // check all squares
    for (let s = 1; s < 9 && valid; s++) {
      if (!this.compare(expected, this.getSquare(board, s))) valid = false;
    }
    return valid;
  }

  // brut force method. Takes in the workingBoard
  backtrackBased(board: Board): Board | boolean {
    let completedBoard: Board | boolean;
    for (const r in this.puzzle.value) {
      for (let c = 0; c < 9; c++) {
        // Process each incomplete cell
        if (board[r][c] == 0) {
          this.completeCell(board, r, c);
          if (this.isSolved(board)) return board;
          const cell = board[r][c];
          // If we just created a list of possibilities, iterate them and recurse
          if (Array.isArray(cell)) {
            for (let i = 0; i < cell.length; i++) {
              const tempBoard = JSON.parse(JSON.stringify(board));
              // choose a value
              tempBoard[r][c] = cell[i];
              // recurse again using new board
              if ((completedBoard = this.backtrackBased(tempBoard))) {
                return completedBoard;
              }
            }
            return false;
          }
        }
      }
    }
    return false;
  }

  // Constraint based pass.
  // Apply the rules of Sudoku and mark up the cells we are
  // 100% can only be a single value.
  // takes in the workingBoard
  onValueCellConstraint(board: Board) {
    // Set to false at the start of the loop
    let updated = false;
    for (const r in board) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] == '0') {
          updated = this.completeCell(board, r, c) || updated;
        }
      }
    }

    // Look out for any possibility that appears as a possibility
    // once-only in the row, column, or quadrant.
    // If it does, fill it in!
    for (const r in board) {
      for (let c = 0; c < 9; c++) {
        if (Array.isArray(board[r][c])) {
          let possibilities = board[r][c];
          updated =
            this.appearsOnlyOnce(possibilities, board[r], c, r) ||
            this.appearsOnlyOnce(
              possibilities,
              this.getColumn(board, c),
              c,
              r
            ) ||
            this.appearsOnlyOnce(
              possibilities,
              this.getSquare(board, this.SQUARE_COORDINATES[r][c]),
              c,
              r
            ) ||
            updated;
        }
      }
    }
    // Reinitialize gaps back to zero before ending
    for (const r in board) {
      for (let c = 0; c < 9; c++) {
        if (Array.isArray(board[r][c])) {
          board[r][c] = '0';
        }
      }
    }
    return updated;
  }
}

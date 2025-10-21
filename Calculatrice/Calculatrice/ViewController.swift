//
//  ViewController.swift
//  Calculatrice
//
//  Created by admin on 01/03/2018.
//  Copyright © 2018 sebyrollins. All rights reserved.
//

import UIKit

class ViewController: UIViewController {

    // MARK: - Operation Enum
    enum Operation {
        case none
        case add
        case subtract
        case multiply
        case divide
    }

    // MARK: - Properties
    private var currentOperation: Operation = .none
    private var previousNumber: Double = 0
    private var isEnteringDecimal: Bool = false
    private var decimalMultiplier: Double = 0.1
    private var currentNumber: Double = 0 {
        didSet {
            updateDisplay()
        }
    }

    @IBOutlet weak var currentNumberLabel: UILabel!

    // MARK: - Helper Methods

    private func updateDisplay() {
        // Format number: remove unnecessary decimals (5.0 -> 5, but keep 5.5)
        if currentNumber.truncatingRemainder(dividingBy: 1) == 0 {
            currentNumberLabel.text = "\(Int(currentNumber))"
        } else {
            currentNumberLabel.text = "\(currentNumber)"
        }
    }

    private func calculateResult() {
        let result: Double

        switch currentOperation {
        case .add:
            result = previousNumber + currentNumber
        case .subtract:
            result = previousNumber - currentNumber
        case .multiply:
            result = previousNumber * currentNumber
        case .divide:
            // Protection against division by zero
            if currentNumber == 0 {
                currentNumberLabel.text = "Error"
                currentNumber = 0
                previousNumber = 0
                currentOperation = .none
                return
            }
            result = previousNumber / currentNumber
        case .none:
            result = currentNumber
        }

        previousNumber = result
        currentNumber = result
        isEnteringDecimal = false
        decimalMultiplier = 0.1
    }

    private func setOperation(_ operation: Operation) {
        // First, calculate any pending operation
        if currentOperation != .none && currentNumber != 0 {
            calculateResult()
        } else if currentNumber != 0 {
            previousNumber = currentNumber
        }

        // Set the new operation
        currentOperation = operation
        currentNumber = 0
        isEnteringDecimal = false
        decimalMultiplier = 0.1
    }

    // MARK: - IBActions - Clear and Formatting

    @IBAction func clearDisplay() {
        currentNumber = 0
        previousNumber = 0
        currentOperation = .none
        isEnteringDecimal = false
        decimalMultiplier = 0.1
    }

    @IBAction func changeSign() {
        currentNumber = currentNumber * (-1)
    }

    @IBAction func percentage() {
        currentNumber = currentNumber / 100
    }

    // MARK: - IBActions - Operations

    @IBAction func divide() {
        setOperation(.divide)
    }

    @IBAction func multiply() {
        setOperation(.multiply)
    }

    @IBAction func subtract() {
        setOperation(.subtract)
    }

    @IBAction func add() {
        setOperation(.add)
    }

    @IBAction func equals() {
        calculateResult()
        currentOperation = .none
        currentNumber = 0
    }

    // MARK: - IBActions - Number Input

    @IBAction func tapDigit(_ sender: UIButton) {
        let digit = Double(sender.tag)

        if isEnteringDecimal {
            // Adding decimal digits
            currentNumber = currentNumber + (digit * decimalMultiplier)
            decimalMultiplier *= 0.1
        } else {
            // Adding integer digits
            currentNumber = currentNumber * 10 + digit
        }
    }

    @IBAction func tapDecimalPoint() {
        if !isEnteringDecimal {
            isEnteringDecimal = true
            decimalMultiplier = 0.1
        }
    }

    // MARK: - View Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        updateDisplay()
    }
}

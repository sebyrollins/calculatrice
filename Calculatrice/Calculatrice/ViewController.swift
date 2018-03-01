//
//  ViewController.swift
//  Calculatrice
//
//  Created by admin on 01/03/2018.
//  Copyright © 2018 sebyrollins. All rights reserved.
//

import UIKit

class ViewController: UIViewController {
    var _operateur:Character = " "
    var _previousNumber : Double = 0
    var _currentNumber : Double = 0 {
        didSet{
            ui_currentNumberlabel.text = "\(_currentNumber)"
        }
    }
    
    @IBOutlet weak var ui_currentNumberlabel: UILabel!
    
    func calculDirect (){
        let result:Double
        
        if _operateur == "+" {
            result = _previousNumber + _currentNumber
        } else if _operateur == "-" {
            result = _previousNumber - _currentNumber
        } else if _operateur == "/" {
            result = _previousNumber / _currentNumber
        } else if _operateur == "*" {
            result = _previousNumber * _currentNumber
        } else {
            result = _currentNumber
        }
        _previousNumber = result
        _currentNumber = 0
        ui_currentNumberlabel.text = "\(result)"
    }
    
    @IBAction func effaceDigit() {
        _currentNumber = 0
        _previousNumber = 0
    }
    @IBAction func changeSign() {
        _currentNumber = _currentNumber * (-1)
    }
    @IBAction func pourcentage() {
        _currentNumber = _currentNumber / 100
    }
    
    @IBAction func diviseDigit() {
        _operateur = "/"
        calculDirect ()
    }
    @IBAction func multiplyDigit() {
        _operateur = "*"
        calculDirect ()
    }
    @IBAction func soustractionDigit() {
        _operateur = "-"
        calculDirect ()
    }
    @IBAction func addDigit() {
        _operateur = "+"
        calculDirect ()
    }
    @IBAction func resultDigit() {
        calculDirect ()
    }
    
    
    @IBAction func tapDigit(_ sender: UIButton) {
        _currentNumber = _currentNumber*10 + Double(sender.tag)
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }


}

